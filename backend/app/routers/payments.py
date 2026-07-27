import stripe
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.database import get_db
from app.models.user import User
from app.models.ride import Ride
from app.models.payment import Payment
from app.schemas.payment import (
    CreateCustomerRequest, CustomerResponse,
    PaymentIntentRequest, PaymentIntentResponse,
    ConfirmPaymentRequest, ConfirmPaymentResponse,
    RefundRequest, RefundResponse,
    PaymentDetailsResponse
)
from app.utils.security import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])
logger = logging.getLogger("payments")

# Initialize Stripe API Key
stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/create-customer", response_model=CustomerResponse)
def create_customer(
    payload: CreateCustomerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a Stripe customer for the authenticated user if they don't already have one.
    """
    if current_user.stripe_customer_id:
        return CustomerResponse(
            stripe_customer_id=current_user.stripe_customer_id,
            message="Customer already exists."
        )

    try:
        customer = stripe.Customer.create(
            email=payload.email,
            name=payload.name,
            metadata={"user_id": str(current_user.id)}
        )
        current_user.stripe_customer_id = customer.id
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return CustomerResponse(
            stripe_customer_id=customer.id,
            message="Stripe customer created successfully."
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Customer Creation Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
def create_payment_intent(
    payload: PaymentIntentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a Stripe PaymentIntent, an Ephemeral Key for Customer sheet, and registers a pending Payment.
    """
    ride = db.query(Ride).filter(Ride.id == payload.ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found.")

    # 1. Ensure user has a Stripe Customer ID
    stripe_customer_id = current_user.stripe_customer_id
    if not stripe_customer_id:
        try:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.name,
                metadata={"user_id": str(current_user.id)}
            )
            stripe_customer_id = customer.id
            current_user.stripe_customer_id = stripe_customer_id
            db.add(current_user)
            db.commit()
            db.refresh(current_user)
        except stripe.error.StripeError as e:
            logger.error(f"Stripe Auto Customer Creation Error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to create Stripe customer: {e}")

    # 2. Create Stripe Ephemeral Key for Customer sheet
    try:
        ephemeral_key = stripe.EphemeralKey.create(
            customer=stripe_customer_id,
            stripe_version="2023-10-16"  # Using stable version
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Ephemeral Key Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create ephemeral key: {e}")

    # Convert amount to cents (USD) or equivalent lowest denomination
    amount_in_cents = int(round(payload.amount * 100))

    # 3. Create Stripe PaymentIntent
    try:
        idempotency_key = payload.idempotency_key or f"ride-{payload.ride_id}-{uuid.uuid4()}"
        intent = stripe.PaymentIntent.create(
            amount=amount_in_cents,
            currency=payload.currency.lower(),
            customer=stripe_customer_id,
            automatic_payment_methods={"enabled": True},
            metadata={
                "user_id": str(current_user.id),
                "ride_id": str(payload.ride_id)
            },
            idempotency_key=idempotency_key
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe PaymentIntent Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    # 4. Save Payment record in the Database
    # Check if a payment for this PaymentIntent already exists
    existing_payment = db.query(Payment).filter(Payment.payment_intent_id == intent.id).first()
    if not existing_payment:
        db_payment = Payment(
            payment_id=f"pay_{uuid.uuid4().hex[:16]}",
            payment_intent_id=intent.id,
            stripe_customer_id=stripe_customer_id,
            user_id=current_user.id,
            ride_id=payload.ride_id,
            amount=payload.amount,
            currency=payload.currency,
            payment_status="pending"
        )
        db.add(db_payment)
        db.commit()

    return PaymentIntentResponse(
        payment_intent_id=intent.id,
        client_secret=intent.client_secret,
        ephemeral_key=ephemeral_key.secret,
        customer_id=stripe_customer_id,
        publishable_key=settings.STRIPE_PUBLISHABLE_KEY
    )

@router.post("/confirm-payment", response_model=ConfirmPaymentResponse)
def confirm_payment(
    payload: ConfirmPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Locally verifies and updates database record by retrieving status directly from Stripe.
    """
    payment = db.query(Payment).filter(Payment.payment_intent_id == payload.payment_intent_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    try:
        intent = stripe.PaymentIntent.retrieve(payload.payment_intent_id)
        if intent.status == "succeeded":
            payment.payment_status = "succeeded"
            payment.payment_method = intent.payment_method
            payment.updated_at = datetime.utcnow()

            # Also update the Ride status to "completed" if it was pending payment
            if payment.ride_id:
                ride = db.query(Ride).filter(Ride.id == payment.ride_id).first()
                if ride and ride.status in ["pending", "accepted"]:
                    ride.status = "completed"
                    db.add(ride)

            db.commit()
            db.refresh(payment)

            return ConfirmPaymentResponse(
                payment_id=payment.payment_id,
                payment_intent_id=payment.payment_intent_id,
                status=payment.payment_status,
                message="Payment confirmed successfully."
            )
        else:
            return ConfirmPaymentResponse(
                payment_id=payment.payment_id,
                payment_intent_id=payment.payment_intent_id,
                status=intent.status,
                message=f"Payment status on Stripe is: {intent.status}"
            )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Confirmation Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/refund", response_model=RefundResponse)
def refund_payment(
    payload: RefundRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers a Stripe Refund for a PaymentIntent and updates database.
    """
    payment = db.query(Payment).filter(Payment.payment_intent_id == payload.payment_intent_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    try:
        refund_args = {"payment_intent": payload.payment_intent_id}
        if payload.amount:
            refund_args["amount"] = int(round(payload.amount * 100))

        refund = stripe.Refund.create(**refund_args)

        payment.refund_status = "full" if refund.status == "succeeded" and not payload.amount else "partial"
        payment.payment_status = "refunded"
        payment.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(payment)

        return RefundResponse(
            refund_id=refund.id,
            payment_intent_id=payment.payment_intent_id,
            status=refund.status,
            amount=payload.amount or payment.amount,
            message="Refund processed successfully."
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Refund Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{payment_id}", response_model=PaymentDetailsResponse)
def get_payment_details(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gets the tracking payment details for a given database payment_id.
    """
    payment = db.query(Payment).filter(Payment.payment_id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    # Restrict viewing to the owner or admins
    if payment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return payment

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Listens for secure Stripe event notifications to update transaction records asynchronously.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    if not webhook_secret:
        # If no secret is configured, just deserialize without signature check (safe for sandbox/development only)
        try:
            event = stripe.Event.construct_from(request.state.json_data or {}, stripe.api_key)
        except Exception as e:
            logger.error(f"Webhook event parsing failure: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload.")
    else:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError as e:
            logger.error(f"Webhook ValueError: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload.")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook Signature Verification Error: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature.")

    # Handle the event
    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})

    logger.info(f"Received Stripe Webhook Event: {event_type}")

    if event_type == "payment_intent.succeeded":
        payment_intent_id = data_object.get("id")
        payment = db.query(Payment).filter(Payment.payment_intent_id == payment_intent_id).first()
        if payment:
            payment.payment_status = "succeeded"
            payment.payment_method = data_object.get("payment_method")
            payment.receipt_url = data_object.get("charges", {}).get("data", [{}])[0].get("receipt_url")
            payment.updated_at = datetime.utcnow()

            # Mark ride as completed/paid
            if payment.ride_id:
                ride = db.query(Ride).filter(Ride.id == payment.ride_id).first()
                if ride and ride.status in ["pending", "accepted"]:
                    ride.status = "completed"
                    db.add(ride)

            db.commit()
            logger.info(f"PaymentIntent {payment_intent_id} marked as succeeded.")

    elif event_type == "payment_intent.payment_failed":
        payment_intent_id = data_object.get("id")
        payment = db.query(Payment).filter(Payment.payment_intent_id == payment_intent_id).first()
        if payment:
            payment.payment_status = "failed"
            payment.updated_at = datetime.utcnow()
            db.commit()
            logger.warn(f"PaymentIntent {payment_intent_id} marked as failed.")

    elif event_type == "charge.refunded":
        payment_intent_id = data_object.get("payment_intent")
        payment = db.query(Payment).filter(Payment.payment_intent_id == payment_intent_id).first()
        if payment:
            payment.payment_status = "refunded"
            payment.refund_status = "full" if data_object.get("refunded") else "partial"
            payment.updated_at = datetime.utcnow()
            db.commit()
            logger.info(f"Refund processed for PaymentIntent {payment_intent_id}.")

    return {"status": "success"}
