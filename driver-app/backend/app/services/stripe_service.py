"""Stripe helpers: saved cards (setup mode), off-session charging at booking, refunds."""
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


def charge_for_ride(db: Session, user, ride, idempotency_key: str = None) -> str:
    """Charge the saved card for the ride fare (money goes to the platform/admin Stripe account).
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
    if intent.status != "succeeded":
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
