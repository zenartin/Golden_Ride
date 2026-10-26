from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

class GoldenRideException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class RideNotFoundError(GoldenRideException):
    def __init__(self, message: str = "Ride request not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)

class RideAlreadyAcceptedError(GoldenRideException):
    def __init__(self, message: str = "Ride request has already been accepted"):
        super().__init__(message, status_code=status.HTTP_409_CONFLICT)

class RideExpiredError(GoldenRideException):
    def __init__(self, message: str = "Ride request has expired"):
        super().__init__(message, status_code=status.HTTP_410_GONE)

class DriverNotFoundError(GoldenRideException):
    def __init__(self, message: str = "Driver not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)

class AuthenticationError(GoldenRideException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED)

def register_exception_handlers(app: FastAPI):
    @app.exception_handler(GoldenRideException)
    async def golden_ride_exception_handler(request: Request, exc: GoldenRideException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"status": "error", "detail": exc.message}
        )
