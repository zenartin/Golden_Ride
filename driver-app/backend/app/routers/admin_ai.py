import logging
import time
from collections import defaultdict, deque
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.admin import Admin
from app.services import admin_assistant
from app.utils.security import get_current_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/ai", tags=["admin-ai"])

MAX_MESSAGES = 30
MAX_CHARS = 4000
RATE_LIMIT = 15  # questions per minute per admin
_recent = defaultdict(deque)


class ChatMessage(BaseModel):
    role: str
    content: str = Field(min_length=1, max_length=MAX_CHARS)


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


@router.get("/status")
def status(current_admin: Admin = Depends(get_current_admin)):
    return {"configured": admin_assistant.is_configured(), "model": admin_assistant.current_model(), "provider": admin_assistant.provider()}


@router.post("/chat")
def chat(payload: ChatRequest, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    if not admin_assistant.is_configured():
        raise HTTPException(status_code=503, detail="The AI assistant is not set up yet. Ask your developer to add an AI API key (a free Groq or Google Gemini key works) on the server.")
    msgs = payload.messages[-MAX_MESSAGES:]
    if not msgs or msgs[-1].role != "user" or any(m.role not in ("user", "assistant") for m in msgs):
        raise HTTPException(status_code=400, detail="Send the conversation so far, ending with your question.")
    while msgs and msgs[0].role != "user":
        msgs = msgs[1:]

    now = time.time()
    q = _recent[current_admin.id]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many questions in a minute. Please wait a moment.")
    q.append(now)

    try:
        return admin_assistant.chat(db, [m.model_dump() for m in msgs])
    except admin_assistant.AssistantNotConfigured:
        raise HTTPException(status_code=503, detail="The AI assistant is not set up yet.")
    except Exception as e:
        # Never leak keys or provider details to the browser
        logger.error(f"Admin assistant failed: {type(e).__name__}: {e}")
        name = type(e).__name__
        if name in ("AuthenticationError", "AssistantAuthError"):
            raise HTTPException(status_code=502, detail="The AI assistant's API key was rejected. Ask your developer to check it.")
        if name in ("RateLimitError", "AssistantRateLimited"):
            raise HTTPException(status_code=429, detail="The AI service is busy or you hit its free limit. Please try again in a minute.")
        raise HTTPException(status_code=502, detail="The AI assistant could not answer right now. Please try again.")
