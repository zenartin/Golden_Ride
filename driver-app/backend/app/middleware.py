import time
import uuid
import logging
from fastapi import FastAPI, Request
from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger("app")


class RequestTracingMiddleware:
    """
    Pure ASGI middleware for request tracing.
    Unlike BaseHTTPMiddleware, this correctly passes through WebSocket
    upgrade requests without intercepting them (BaseHTTPMiddleware breaks
    WebSocket connections in FastAPI/Starlette).
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # Pass WebSocket connections directly — do NOT intercept them
        if scope["type"] == "websocket":
            await self.app(scope, receive, send)
            return

        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = None
        # Extract request ID from headers if available
        for header_name, header_value in scope.get("headers", []):
            if header_name == b"x-request-id":
                request_id = header_value.decode()
                break
        if not request_id:
            request_id = str(uuid.uuid4())

        start_time = time.time()

        # Intercept send to capture the status code
        status_code = [200]

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code[0] = message.get("status", 200)
                # Inject tracing headers into the response
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode()))
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            process_time = time.time() - start_time
            path = scope.get("path", "")
            method = scope.get("method", "")
            logger.info(
                f"ID: {request_id} - Method: {method} - Path: {path} "
                f"- Status: {status_code[0]} - Duration: {process_time:.4f}s"
            )


def setup_middleware(app: FastAPI):
    app.add_middleware(RequestTracingMiddleware)
