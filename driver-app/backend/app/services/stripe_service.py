"""Stripe helpers: saved cards (setup mode), card holds at booking, capture at trip end, refunds."""
import os
import logging
import stripe
from sqlalchemy.orm import Session
from app.core.config import settings

logger = logging.getLogger("app")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", settings.STRIPE_SECRET_KEY)


class PaymentError(Exception):
    pass


def is_mock() -> bool:
    key = stripe.api_key or ""
    return (not key) or key.startswith("sk_test_replace_me") or key == "sk_test_mock"


def ensure_customer(db: Session, user) -> str:
    if user.stripe_customer_id and not user.stripe_customer_id.startswith("cus_mock"):
        return user.stripe_customer_id
    if is_mock():
        user.stripe_customer_id = f"cus_mock_{user.id}"
    else:
        cust = stripe.Customer.create(email=user.email, name=user.name, phone=user.phone,
                                      metadata={"user_id": user.id})
        user.stripe_customer_id = cust.id
    db.add(user)
    db.commit()
    return user.stripe_customer_id


def save_payment_method(db: Session, user, payment_method_id: str):
    """Attach a payment method to the customer, set as default and remember brand/last4."""
    if is_mock() or payment_method_id.startswith("pm_mock"):
        user.stripe_payment_method_id = payment_method_id
        user.card_brand = "visa"
        user.card_last4 = "4242"
    else:
        customer_id = ensure_customer(db, user)
        pm = stripe.PaymentMethod.retrieve(payment_method_id)
        if not pm.customer:
            stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
        stripe.Customer.modify(customer_id, invoice_settings={"default_payment_method": payment_method_id})
        user.stripe_payment_method_id = payment_method_id
        user.card_brand = pm.card.brand if pm.card else None
        user.card_last4 = pm.card.last4 if pm.card else None
    db.add(user)
    db.commit()


def charge_amount(db: Session, user, amount_usd: float, description: str, idempotency_key: str) -> str:
    """Charge the saved card straight away (gift cards). Raises PaymentError if declined."""
    if not user.stripe_payment_method_id:
        raise PaymentError("Please add a credit or debit card first.")
    if is_mock():
        return f"pi_mock_{idempotency_key}"
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(round(amount_usd * 100)),
            currency="usd",
            customer=ensure_customer(db, user),
            payment_method=user.stripe_payment_method_id,
            off_session=True,
            confirm=True,
            description=description,
            receipt_email=user.email,
            idempotency_key=idempotency_key,
        )
    except stripe.error.CardError as e:
        raise PaymentError(e.user_message or "Your card was declined.")
    except Exception as e:
        logger.error(f"Stripe charge failed ({description}): {e}")
        raise PaymentError("Payment could not be processed. Please check your card and try again.")
    if intent.status != "succeeded":
        raise PaymentError("Your bank needs extra verification. Please update your card and try again.")
    return intent.id


def capture_ride(ride) -> bool:
    """Take the money for a hold placed at booking. Stripe emails the receipt on capture."""
    pi = ride.stripe_payment_intent_id
    if not pi or pi.startswith("pi_mock") or pi == "pi_free" or is_mock():
        return True
    try:
        stripe.PaymentIntent.capture(pi, amount_to_capture=int(round(float(ride.actual_fare or ride.fare_amount) * 100)))
        return True
    except Exception as e:
        logger.error(f"Capture failed for ride {ride.id}: {e}")
        return False


def release_hold(ride, intent_id: str = None) -> bool:
    """Drop a hold that was never captured; the rider is not charged."""
    pi = intent_id or ride.stripe_payment_intent_id
    if not pi or pi.startswith("pi_mock") or pi == "pi_free" or is_mock():
        return True
    try:
        stripe.PaymentIntent.cancel(pi)
        return True
    except Exception as e:
        logger.error(f"Could not release hold {pi} for ride {ride.id}: {e}")
        return False


def charge_for_ride(db: Session, user, ride, idempotency_key: str = None) -> str:
    """Place a hold on the saved card for the ride fare; capture_ride takes the money at trip end.
    Returns the PaymentIntent id. Raises PaymentError if the card is missing or declined."""
    if not user.stripe_payment_method_id:
        raise PaymentError("Please add a credit or debit card before booking a ride.")
    amount = int(round(float(ride.fare_amount) * 100))
    if amount <= 0:
        return "pi_free"
    if is_mock():
        return f"pi_mock_{ride.id}"
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="usd",
            capture_method="manual",
            receipt_email=user.email,
            customer=ensure_customer(db, user),
            payment_method=user.stripe_payment_method_id,
            off_session=True,
            confirm=True,
            description=f"Golden Ride fare #{ride.id}",
            metadata={"ride_id": ride.id, "user_id": user.id},
            idempotency_key=idempotency_key or f"ride-{ride.id}-charge",
        )
    except stripe.error.CardError as e:
        raise PaymentError(e.user_message or "Your card was declined.")
    except Exception as e:
        logger.error(f"Stripe charge failed for ride {ride.id}: {e}")
        raise PaymentError("Payment could not be processed. Please check your card and try again.")
    if intent.status != "requires_capture":
        raise PaymentError("Your bank needs extra verification. Please update your card and try again.")
    return intent.id


def refund_ride(ride, amount: float = None) -> bool:
    """Refund what is left on the ride's charge, or just `amount` when given."""
    pi = getattr(ride, "stripe_payment_intent_id", None)
    if not pi or pi.startswith("pi_mock") or pi == "pi_free" or is_mock():
        return True
    try:
        args = {"payment_intent": pi}
        if amount is not None:
            args["amount"] = int(round(amount * 100))
        stripe.Refund.create(**args)
        return True
    except Exception as e:
        logger.error(f"Refund failed for ride {ride.id}: {e}")
        return False


def connect_account_link(db: Session, driver, return_url: str) -> str:
    """Stripe-hosted onboarding where the driver adds a US debit card for cash out."""
    if is_mock():
        driver.stripe_account_id = driver.stripe_account_id or f"acct_mock_{driver.id}"
        db.add(driver)
        db.commit()
        return None
    if not driver.stripe_account_id:
        account = stripe.Account.create(
            type="express", country="US", email=driver.email,
            capabilities={"transfers": {"requested": True}},
            metadata={"driver_id": driver.id},
        )
        driver.stripe_account_id = account.id
        db.add(driver)
        db.commit()
    link = stripe.AccountLink.create(
        account=driver.stripe_account_id, type="account_onboarding",
        refresh_url=return_url, return_url=return_url,
    )
    return link.url


def connect_status(driver) -> dict:
    account_id = driver.stripe_account_id
    if not account_id:
        return {"connected": False, "instant_available": False, "card": None}
    if is_mock() or account_id.startswith("acct_mock"):
        return {"connected": True, "instant_available": True, "card": "visa 4242"}
    account = stripe.Account.retrieve(account_id)
    cards = stripe.Account.list_external_accounts(account_id, object="card", limit=5).data
    instant = next((c for c in cards if "instant" in (c.available_payout_methods or [])), None)
    return {
        "connected": bool(account.payouts_enabled),
        "instant_available": bool(account.payouts_enabled and instant),
        "card": f"{instant.brand} {instant.last4}" if instant else None,
    }


def instant_payout(driver, amount_usd: float, withdrawal_id: int) -> str:
    """Move earnings to the driver's Connect account, then pay out instantly to their debit card."""
    if is_mock() or (driver.stripe_account_id or "").startswith("acct_mock"):
        return f"po_mock_{withdrawal_id}"
    cents = int(round(amount_usd * 100))
    try:
        stripe.Transfer.create(
            amount=cents, currency="usd", destination=driver.stripe_account_id,
            idempotency_key=f"cashout-{withdrawal_id}-transfer",
        )
        payout = stripe.Payout.create(
            amount=cents, currency="usd", method="instant",
            stripe_account=driver.stripe_account_id,
            idempotency_key=f"cashout-{withdrawal_id}-payout",
        )
        return payout.id
    except Exception as e:
        logger.error(f"Instant payout failed for driver {driver.id}: {e}")
        raise PaymentError("Instant cash out failed. Please check your debit card and try again.")
