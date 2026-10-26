from sqlalchemy.orm import Session
from datetime import datetime
from app.models.ride_assignment import RideAssignment

class RideAssignmentRepository:
    @staticmethod
    def create_assignment(db: Session, ride_id: int, driver_id: int, status: str = "offered") -> RideAssignment:
        existing = db.query(RideAssignment).filter(
            RideAssignment.ride_id == ride_id,
            RideAssignment.driver_id == driver_id
        ).first()
        if existing:
            existing.status = status
            db.commit()
            db.refresh(existing)
            return existing

        assignment = RideAssignment(
            ride_id=ride_id,
            driver_id=driver_id,
            status=status
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment

    @staticmethod
    def get_by_ride_and_driver(db: Session, ride_id: int, driver_id: int) -> RideAssignment:
        return db.query(RideAssignment).filter(
            RideAssignment.ride_id == ride_id,
            RideAssignment.driver_id == driver_id
        ).first()

    @staticmethod
    def update_assignment_status(db: Session, assignment: RideAssignment, status: str, response_type: str = None) -> RideAssignment:
        assignment.status = status
        assignment.responded_at = datetime.utcnow()
        if response_type:
            assignment.response_type = response_type
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment

    @staticmethod
    def expire_assignments(db: Session, ride_id: int) -> None:
        db.query(RideAssignment).filter(
            RideAssignment.ride_id == ride_id,
            RideAssignment.status == "offered"
        ).update({
            "status": "expired",
            "responded_at": datetime.utcnow(),
            "response_type": "timeout"
        })
        db.commit()
