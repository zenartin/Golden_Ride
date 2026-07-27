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
        cls.initialize()
        
        if not cls._initialized:
            logger.info(f"[MOCK PUSH] Sent to token {token}: Title='{title}', Body='{body}', Data={data}")
            return True

        try:
            # Expo Notifications FCM format requires data payload with proper format
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                token=token
            )
            response = messaging.send(message)
            logger.info(f"FCM notification sent successfully: {response}")
            return True
        except Exception as e:
            logger.error(f"Error sending FCM push notification: {e}")
            # If token is invalid, we should return False so the repository can deactivate it
            if "registration-token-not-registered" in str(e).lower() or "invalid-registration-token" in str(e).lower():
                logger.info(f"FCM token {token} is invalid. Deactivating.")
                return False
            return True

    @classmethod
    def send_multicast_notification(cls, tokens: List[str], title: str, body: str, data: Dict[str, str] = None) -> List[str]:
        """
        Sends push notification to multiple tokens. Returns a list of tokens that failed and should be deactivated.
        """
        cls.initialize()
        failed_tokens = []
        if not tokens:
            return failed_tokens

        if not cls._initialized:
            logger.info(f"[MOCK MULTICAST PUSH] Sent to {len(tokens)} tokens: Title='{title}', Body='{body}', Data={data}")
            return failed_tokens

        try:
            # We use send_multicast
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                tokens=tokens
            )
            response = messaging.send_each_for_multicast(message)
            logger.info(f"Multicast sent: {response.success_count} success, {response.failure_count} failure")
            
            for index, resp in enumerate(response.responses):
                if not resp.success:
                    exc = resp.exception
                    token = tokens[index]
                    logger.warning(f"Failed to send to token {token}: {exc}")
                    if "registration-token-not-registered" in str(exc).lower() or "invalid-registration-token" in str(exc).lower():
                        failed_tokens.append(token)
            
        except Exception as e:
            logger.error(f"Error sending multicast notification: {e}")
            
        return failed_tokens
