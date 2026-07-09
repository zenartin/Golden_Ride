from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/content", tags=["content"])

class ContentResponse(BaseModel):
    title: str
    content: str
    version: str

@router.get("/privacy-policy", response_model=ContentResponse)
def get_privacy_policy():
    return ContentResponse(
        title="Privacy Policy",
        content="""# Privacy Policy

Welcome to Golden Ride's Privacy Policy. 

Your privacy is critically important to us. This policy outlines how we collect, use, and protect your personal data when you use the Golden Ride User App.

## 1. Data Collection
We collect the following types of information:
- **Personal Information:** Name, email, phone number, and profile picture.
- **Location Data:** GPS location during active rides and when the app is in the foreground to match you with nearby drivers.
- **Device Data:** Device model, OS version, and network details.

## 2. Use of Data
Your data is used to:
- Provide our ride-hailing services.
- Ensure safety for both riders and drivers.
- Send important account and trip updates.
- Improve our app experience and customer support.

## 3. Data Sharing
We do not sell your personal data. We share necessary information (like pickup location and name) with drivers to fulfill ride requests. 

## 4. Your Rights
You have the right to request access, correction, or deletion of your personal data. You can manage your preferences in the Account Settings.

For questions, please contact our support desk.

*Last Updated: October 2026*""",
        version="1.0"
    )

@router.get("/terms", response_model=ContentResponse)
def get_terms_of_service():
    return ContentResponse(
        title="Terms of Service",
        content="""# Terms of Service

Please read these Terms of Service carefully before using Golden Ride.

## 1. Acceptance of Terms
By creating an account and using the Golden Ride app, you agree to be bound by these terms. If you disagree with any part, you may not use our services.

## 2. User Conduct
Users are expected to behave respectfully towards drivers. Any form of abuse, property damage, or illegal activity during a ride may result in account termination and legal action.

## 3. Payments
Users agree to pay for rides requested through the app. Fares are calculated based on base rates, time, distance, and current demand (surge pricing may apply). Fares are non-refundable unless there was an error in billing.

## 4. Liability
Golden Ride connects riders with independent drivers. We are not liable for the actions, omissions, or behavior of third-party drivers, though we perform extensive background checks.

## 5. Account Suspension
We reserve the right to suspend or terminate accounts that violate these terms or compromise the safety of the Golden Ride community.

*Last Updated: October 2026*""",
        version="1.0"
    )

@router.get("/about", response_model=ContentResponse)
def get_about_us():
    return ContentResponse(
        title="About Us",
        content="""# About Golden Ride

Golden Ride is a premium ride-hailing platform built to provide a seamless, safe, and luxurious travel experience.

Founded in 2026, our mission is to redefine urban mobility by focusing on reliability and top-tier customer service. We believe that a ride should be more than just getting from Point A to Point B—it should be a moment of comfort and peace in your busy day.

## Our Core Values
- **Safety First:** Stringent background checks and real-time ride tracking.
- **Transparency:** Clear upfront pricing with no hidden fees.
- **Community:** Empowering drivers and providing riders with excellent service.

Thank you for choosing Golden Ride!""",
        version="1.0"
    )

@router.get("/support", response_model=ContentResponse)
def get_support_info():
    return ContentResponse(
        title="Help & Support",
        content="""# Help & Support Desk

We're here to help! If you have any issues with your ride, account, or payment, please refer to the resources below.

## Contact Us
- **Email:** support@goldenride.com
- **Phone:** 1-800-GOLDEN-RIDE (Available 24/7 for urgent safety matters)
- **Live Chat:** Available in the app from 8:00 AM to 10:00 PM EST.

## Frequently Asked Questions
**Q: How do I report a lost item?**
A: Navigate to 'Trips', select the relevant ride, and tap 'Report Lost Item'. We will contact the driver immediately.

**Q: Can I schedule a ride in advance?**
A: Currently, Golden Ride focuses on on-demand rides, but scheduled rides are coming in our next major update!

**Q: How are fares calculated?**
A: Fares are based on a base pickup fee plus a per-mile and per-minute rate. You'll always see an estimated fare before booking.""",
        version="1.0"
    )
