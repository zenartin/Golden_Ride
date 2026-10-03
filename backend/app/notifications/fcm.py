import os
import logging
import firebase_admin
from firebase_admin import credentials, messaging
from typing import Dict, Any, List

logger = logging.getLogger("app")

class FCMService:
    _initialized = False

    @classmethod
    def initialize(cls):
        if cls._initialized:
            return
        
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        if not cred_path:
            logger.warning("FIREBASE_CREDENTIALS_PATH environment variable not set. FCM notifications will be mocked.")
            return

        if not os.path.exists(cred_path):
            logger.warning(f"Firebase credentials file not found at {cred_path}. FCM notifications will be mocked.")
            return

        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            cls._initialized = True
            logger.info("Firebase Admin SDK initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")

    @classmethod
    def send_push_notification(cls, token: str, title: str, body: str, data: Dict[str, str] = None) -> bool:
        return len(cls.send_multicast_notification([token], title, body, data)) == 0

    @classmethod
    def send_multicast_notification(cls, tokens: List[str], title: str, body: str, data: Dict[str, str] = None) -> List[str]:
        """
        Sends push notification to multiple tokens. Returns a list of tokens that failed.
        """
        failed_tokens = []
        if not tokens:
            return failed_tokens

        import requests
        
        expo_tokens = [t for t in tokens if t.startswith("ExponentPushToken") or t.startswith("ExpoPushToken")]
        fcm_tokens = [t for t in tokens if t not in expo_tokens]

        if expo_tokens:
            messages = []
            for t in expo_tokens:
                msg = {
                    "to": t,
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "sound": "default",
                    "channelId": "trip_requests",
                    "priority": "high",
                }
                # If it's a ride request, trigger custom sound
                if data and data.get("type") == "new_ride":
                    msg["sound"] = "trip_request.wav"
                
                messages.append(msg)
            
            try:
                response = requests.post(
                    "https://exp.host/--/api/v2/push/send",
                    json=messages,
                    headers={"Accept": "application/json", "Accept-Encoding": "gzip, deflate", "Content-Type": "application/json"}
                )
                if response.status_code == 200:
                    resp_data = response.json().get("data", [])
                    for i, r in enumerate(resp_data):
                        if r.get("status") == "error":
                            if r.get("details", {}).get("error") in ["DeviceNotRegistered", "InvalidCredentials"]:
                                failed_tokens.append(expo_tokens[i])
            except Exception as e:
                logger.error(f"Error sending Expo push: {e}")

        if fcm_tokens:
            cls.initialize()
            if cls._initialized:
                try:
                    # Native FCM payload for Android high priority + custom sound
                    android_config = messaging.AndroidConfig(
                        priority="high",
                        notification=messaging.AndroidNotification(
                            channel_id="trip_requests",
                            sound="trip_request.wav" if data and data.get("type") == "new_ride" else "default"
                        )
                    )
                    
                    message = messaging.MulticastMessage(
                        notification=messaging.Notification(
                            title=title,
                            body=body
                        ),
                        data=data or {},
                        android=android_config,
                        tokens=fcm_tokens
                    )
                    response = messaging.send_each_for_multicast(message)
                    logger.info(f"Multicast sent: {response.success_count} success, {response.failure_count} failure")
                    
                    for index, resp in enumerate(response.responses):
                        if not resp.success:
                            exc = resp.exception
                            token = fcm_tokens[index]
                            logger.warning(f"Failed to send to token {token}: {exc}")
                            if "registration-token-not-registered" in str(exc).lower() or "invalid-registration-token" in str(exc).lower():
                                failed_tokens.append(token)
                except Exception as e:
                    logger.error(f"Error sending FCM multicast: {e}")
            else:
                logger.info(f"[MOCK PUSH] Would send to {len(fcm_tokens)} FCM tokens")

        return failed_tokens
