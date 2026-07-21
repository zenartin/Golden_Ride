import json
from datetime import datetime

log_path = r"C:\Users\nanda\.gemini\antigravity\brain\e277519f-b402-4035-a655-3ef924864cbf\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("type") == "USER_INPUT":
                ts = data.get("created_at") or data.get("timestamp") or "Unknown Time"
                content = data.get("content", "")
                content = content.replace("\n", " ")
                print(f"[{ts}] {content[:100]}")
        except:
            pass
