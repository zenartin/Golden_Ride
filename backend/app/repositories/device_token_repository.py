from sqlalchemy.orm import Session
from typing import List
from app.models.device_token import DeviceToken

class DeviceTokenRepository:
    @staticmethod
    def save_token(db: Session, driver_id: int, token: str, platform: str = None) -> DeviceToken:
        # Check if token exists
        existing = db.query(DeviceToken).filter(DeviceToken.token == token).first()
        if existing:
            existing.driver_id = driver_id
            existing.platform = platform or existing.platform
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return existing

        new_token = DeviceToken(
            driver_id=driver_id,
            token=token,
            platform=platform,
            is_active=True
        )
        db.add(new_token)
        db.commit()
        db.refresh(new_token)
        return new_token

    @staticmethod
    def get_tokens_by_driver(db: Session, driver_id: int) -> List[str]:
        tokens = db.query(DeviceToken).filter(
            DeviceToken.driver_id == driver_id,
            DeviceToken.is_active == True
        ).all()
        return [t.token for t in tokens]

    @staticmethod
    def deactivate_token(db: Session, token: str) -> None:
        db_token = db.query(DeviceToken).filter(DeviceToken.token == token).first()
        if db_token:
            db_token.is_active = False
            db.commit()
