from sqlalchemy.orm import Session
from app.models.user import User

class UserRepository:
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> User:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> User:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_by_phone(db: Session, phone: str) -> User:
        return db.query(User).filter(User.phone == phone).first()

    @staticmethod
    def create(db: Session, name: str, email: str, phone: str, password_hash: str) -> User:
        user = User(
            name=name,
            email=email,
            phone=phone,
            password_hash=password_hash
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_balance(db: Session, user: User, amount: float) -> User:
        user.wallet_balance += amount
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
