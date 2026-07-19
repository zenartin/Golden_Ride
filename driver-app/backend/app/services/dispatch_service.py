import logging
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.models.ride import Ride
from app.models.driver import Driver, DriverDocument
from app.models.ride_assignment import RideAssignment
from app.websocket.manager import manager
from app.notifications.fcm import FCMService
from app.repositories.device_token_repository import DeviceTokenRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.ride_assignment_repository import RideAssignmentRepository

logger = logging.getLogger("app")

class DispatchService:
    @staticmethod
    def _serialize_ride(ride: Ride) -> Dict[str, Any]:
        return {
            "id": ride.id,
            "rider_name": ride.rider_name,
            "rider_rating": ride.rider_rating,
            "rider_trips": ride.rider_trips,
            "ride_class": ride.ride_class,
            "from_location": ride.from_location,
            "to_location": ride.to_location,
            "pickup_latitude": ride.pickup_latitude,
            "pickup_longitude": ride.pickup_longitude,
            "dropoff_latitude": ride.dropoff_latitude,
            "dropoff_longitude": ride.dropoff_longitude,
            "distance": ride.distance,
            "duration": ride.duration,
            "fare": ride.fare,
            "fare_amount": ride.fare_amount,
            "payment_method": ride.payment_method,
            "pickup_eta": ride.pickup_eta,
            "status": ride.status,
            "created_at": ride.created_at.isoformat() if ride.created_at else None,
            # Count down timer base
            "expires_at": (ride.created_at.timestamp() + 300) if ride.created_at else None
        }

    @classmethod
    async def dispatch_ride(cls, db: Session, ride: Ride):
        logger.info(f"Starting dispatch for ride {ride.id}")
        
        # Serialize ride for transmission
        ride_payload = cls._serialize_ride(ride)
        message = {
            "type": "new_ride",
            "ride": ride_payload
        }

        target_classes = [ride.ride_class.lower()]

        from sqlalchemy import func
        drivers = (
            db.query(Driver)
            .join(DriverDocument)
            .filter(
                Driver.is_online == True
            )
            .all()
        )
        logger.info(f"Dispatching to {len(drivers)} online drivers with vehicle class {ride.ride_class}")

        for driver in drivers:
            # 1. Create a RideAssignment record
            RideAssignmentRepository.create_assignment(db, ride.id, driver.id, "offered")

            # 2. Create DriverNotification in DB
            notif = NotificationRepository.create_notification(
                db, 
                driver_id=driver.id, 
                ride_id=ride.id, 
                notification_type="new_ride", 
                status="pending"
            )

            # 3. Check WebSocket connection
            if manager.is_driver_connected(driver.id):
                # Deliver instantly via WebSocket
                success = await manager.send_to_driver(driver.id, message)
                if success:
                    notif.status = "delivered"
                    notif.delivered_via = "websocket"
                    db.commit()
                    logger.info(f"Ride {ride.id} delivered via WS to driver {driver.id}")
                    continue

            # 4. If WS not connected or failed, try FCM
            tokens = DeviceTokenRepository.get_tokens_by_driver(db, driver.id)
            if tokens:
                # Send FCM push
                title = "New Ride Request! 🚕"
                body = f"Pickup: {ride.from_location} | Drop: {ride.to_location} | Fare: {ride.fare}"
                
                fcm_data = {
                    "type": "new_ride",
                    "ride_id": str(ride.id),
                    "pickup": ride.from_location,
                    "dropoff": ride.to_location,
                    "fare": ride.fare
                }
                
                failed_tokens = FCMService.send_multicast_notification(
                    tokens=tokens,
                    title=title,
                    body=body,
                    data=fcm_data
                )
                
                # Deactivate failed tokens
                for t in failed_tokens:
                    DeviceTokenRepository.deactivate_token(db, t)
                
                # Update status
                notif.status = "delivered"
                notif.delivered_via = "fcm"
                db.commit()
                logger.info(f"Ride {ride.id} notification pushed via FCM to driver {driver.id}")
            else:
                # Completely offline driver (no WebSocket, no active push tokens)
                logger.info(f"Driver {driver.id} is completely offline. Ride request saved in DB.")

    @classmethod
    async def notify_ride_accepted(cls, db: Session, ride: Ride, accepted_driver_id: int):
        logger.info(f"Notifying that ride {ride.id} was accepted by driver {accepted_driver_id}")
        
        # 1. Update all other offered assignments for this ride to "expired"
        db.query(RideAssignment).filter(
            RideAssignment.ride_id == ride.id,
            RideAssignment.driver_id != accepted_driver_id,
            RideAssignment.status == "offered"
        ).update({"status": "expired"})
        db.commit()
        
        # 2. Deactivate/dismiss pending notifications in DB
        NotificationRepository.dismiss_by_ride(db, ride.id)

        # 3. Broadcast to all drivers to remove this ride request
        message = {
            "type": "ride_accepted",
            "ride_id": ride.id,
            "driver_id": accepted_driver_id
        }
        await manager.broadcast_to_drivers(message)

        # 4. Notify user if connected via WebSocket
        user_message = {
            "type": "ride_accepted",
            "ride_id": ride.id,
            "status": "accepted",
            "driver": {
                "id": ride.driver.id,
                "name": ride.driver.name,
                "phone": ride.driver.phone,
                "rating": ride.driver.rating,
                "vehicle_number": (ride.driver.documents.vehicle_plate_number or ride.driver.documents.vehicle_number) if ride.driver.documents else "N/A",
                "vehicle_model": ride.driver.documents.vehicle_model if ride.driver.documents else "N/A",
                "vehicle_type": ride.driver.documents.vehicle_type if ride.driver.documents else "N/A"
            }
        }
        if manager.is_user_connected(ride.user_id):
            await manager.send_to_user(ride.user_id, user_message)

    @classmethod
    async def notify_ride_expired(cls, db: Session, ride: Ride):
        logger.info(f"Notifying that ride {ride.id} has expired")
        
        # 1. Update assignments to expired
        RideAssignmentRepository.expire_assignments(db, ride.id)
        
        # 2. Dismiss notifications
        NotificationRepository.dismiss_by_ride(db, ride.id)

        # 3. Broadcast to drivers
        message = {
            "type": "ride_expired",
            "ride_id": ride.id
        }
        await manager.broadcast_to_drivers(message)

        # 4. Notify user via WS
        user_message = {
            "type": "ride_expired",
            "ride_id": ride.id,
            "status": "expired"
        }
        if manager.is_user_connected(ride.user_id):
            await manager.send_to_user(ride.user_id, user_message)

    @classmethod
    async def notify_ride_cancelled(cls, db: Session, ride: Ride):
        logger.info(f"Notifying that ride {ride.id} was cancelled by user")
        
        # 1. Update assignments to expired
        RideAssignmentRepository.expire_assignments(db, ride.id)
        
        # 2. Dismiss notifications
        NotificationRepository.dismiss_by_ride(db, ride.id)

        # 3. Broadcast to drivers to clear cards
        message = {
            "type": "ride_cancelled",
            "ride_id": ride.id
        }
        await manager.broadcast_to_drivers(message)
        
        # 4. Notify assigned driver if exists
        if ride.driver_id:
            driver_message = {
                "type": "ride_status_update",
                "ride_id": ride.id,
                "status": "cancelled"
            }
            await manager.send_to_driver(ride.driver_id, driver_message)

    @classmethod
    async def notify_ride_status_update(cls, db: Session, ride: Ride):
        logger.info(f"Notifying status change for ride {ride.id}: {ride.status}")
        
        # Notify user about status change
        user_message = {
            "type": "ride_status_update",
            "ride_id": ride.id,
            "status": ride.status,
            "actual_fare": ride.actual_fare
        }
        if manager.is_user_connected(ride.user_id):
            await manager.send_to_user(ride.user_id, user_message)

    @classmethod
    async def dispatch_pending_rides_to_driver(cls, db: Session, driver: Driver):
        logger.info(f"Checking for pending rides for newly online driver {driver.id}")
        
        if not driver.documents or not driver.documents.vehicle_type:
            return
            
        driver_vtype = driver.documents.vehicle_type.lower()
        
        pending_rides = db.query(Ride).filter(Ride.status == "pending").all()
        
        for ride in pending_rides:
            target_classes = [ride.ride_class.lower()]
                
            if driver_vtype not in target_classes:
                continue
                
            existing_assignment = db.query(RideAssignment).filter(
                RideAssignment.ride_id == ride.id,
                RideAssignment.driver_id == driver.id
            ).first()
            
            if existing_assignment:
                continue
                
            logger.info(f"Dispatching existing pending ride {ride.id} to late-login driver {driver.id}")
            
            RideAssignmentRepository.create_assignment(db, ride.id, driver.id, "offered")
            notif = NotificationRepository.create_notification(
                db, 
                driver_id=driver.id, 
                ride_id=ride.id, 
                notification_type="new_ride", 
                status="pending"
            )

            if manager.is_driver_connected(driver.id):
                ride_payload = cls._serialize_ride(ride)
                message = {
                    "type": "new_ride",
                    "ride": ride_payload
                }
                success = await manager.send_to_driver(driver.id, message)
                if success:
                    notif.status = "delivered"
                    notif.delivered_via = "websocket"
                    db.commit()

