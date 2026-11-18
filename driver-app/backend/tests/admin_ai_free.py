"""Admin AI assistant on a free OpenAI-style service (Groq / Gemini / OpenRouter). Run from driver-app/backend: python tests/admin_ai_free.py (no network)."""
import os, sys, tempfile, logging, json
from types import SimpleNamespace as NS
from unittest import mock
sys.path.insert(0, os.getcwd())
d=tempfile.mkdtemp(dir=os.environ.get("SP") or None)
os.environ.update(DATABASE_URL=f"sqlite:///{d}/t.db",STRIPE_SECRET_KEY="sk_test_fake_not_real",STRIPE_PUBLISHABLE_KEY="pk_test_fake")
os.chdir(d); logging.disable(logging.CRITICAL)
import requests
from fastapi.testclient import TestClient
import app.utils.helpers as H
H.get_osrm_route=lambda *a,**k:{"distance_km":8.0,"duration_min":15,"distance":"","duration":"15 min","polyline":None}
from app.main import app
from app.core.config import settings
from app.database import SessionLocal
from app.models.admin import Admin
from app.models.driver import Driver
from app.services import admin_assistant as AA
from app.routers import admin_ai
from app.utils.security import get_password_hash
c=TestClient(app,raise_server_exceptions=False);A="/api";h=lambda t:{"Authorization":f"Bearer {t}"}
res=[]
def ok(n,v,i=""): res.append(bool(v)); print(("PASS " if v else "FAIL ")+n,"" if v else str(i)[:300])
db=SessionLocal(); db.add(Admin(email="a@example.com",name="Boss",password_hash=get_password_hash("Passw0rd!x"),role="super_admin")); db.commit(); db.close()
at=c.post(A+"/admin/auth/login",json={"email":"a@example.com","password":"Passw0rd!x"}).json().get("access_token")
c.post(A+"/auth/register",json=dict(name="Dana Driver",email="dana.driver@example.com",phone="+15551110000",password="Passw0rd!x"))
db=SessionLocal(); dv=db.query(Driver).first(); dv.is_approved=True; db.commit(); did=dv.id; db.close()

class Resp:
    def __init__(s,code,body): s.status_code=code; s._b=body; s.text=json.dumps(body)
    def json(s): return s._b
def chat_msg(content=None,calls=None,finish="stop"):
    m={"role":"assistant","content":content}
    if calls: m["tool_calls"]=calls; finish="tool_calls"
    return Resp(200,{"choices":[{"message":m,"finish_reason":finish}],"usage":{"prompt_tokens":50,"completion_tokens":10}})
def call(i,name,args): return {"id":i,"type":"function","function":{"name":name,"arguments":json.dumps(args)}}
class Net:
    def __init__(s,script): s.script=list(script); s.calls=[]
    def post(s,url,**kw):
        s.calls.append(dict(kw,url=url)); r=s.script.pop(0)
        if isinstance(r,Exception): raise r
        return r
def ask(net,q="who is driver 1?",token=None):
    admin_ai._recent.clear()
    with mock.patch("requests.post",net.post):
        return c.post(A+"/admin/ai/chat",headers=h(token or at),json={"messages":[{"role":"user","content":q}]})
def setp(**k):
    vals=dict(ANTHROPIC_API_KEY="",AI_PROVIDER="",AI_API_KEY="",AI_BASE_URL="",AI_MODEL="",AI_REDACT_PII=True); vals.update(k)
    for a,b in vals.items(): setattr(settings,a,b)

setp(); r=c.get(A+"/admin/ai/status",headers=h(at)); ok("nothing set -> not configured",r.json()["configured"] is False and r.json()["provider"] is None,r.text)
setp(AI_API_KEY="free-key-123"); r=c.get(A+"/admin/ai/status",headers=h(at)); ok("a key with no provider or URL is not enough",r.json()["configured"] is True and r.json()["model"]=="" and c.post(A+"/admin/ai/chat",headers=h(at),json={"messages":[{"role":"user","content":"hi"}]}).status_code==503,r.text)
for name,url,model in (("groq","https://api.groq.com/openai/v1","openai/gpt-oss-120b"),("gemini","https://generativelanguage.googleapis.com/v1beta/openai","gemini-3.1-flash-lite"),("openrouter","https://openrouter.ai/api/v1","openrouter/free")):
    setp(AI_API_KEY="free-key-123",AI_PROVIDER=name)
    r=c.get(A+"/admin/ai/status",headers=h(at)); ok(f"{name} preset is recognised",r.json()=={"configured":True,"model":model,"provider":"compat"},r.text)
    net=Net([chat_msg("hello")]); r=ask(net)
    ok(f"{name}: calls the right URL with the key and model",r.status_code==200 and net.calls[0]["url"]==url+"/chat/completions" and net.calls[0]["headers"]["Authorization"]=="Bearer free-key-123" and net.calls[0]["json"]["model"]==model,net.calls[:1])
setp(AI_API_KEY="k",AI_PROVIDER="custom",AI_BASE_URL="https://example.test/v1/",AI_MODEL="my-model"); net=Net([chat_msg("hi")]); ask(net)
ok("custom URL and model are honoured (trailing slash handled)",net.calls[0]["url"]=="https://example.test/v1/chat/completions" and net.calls[0]["json"]["model"]=="my-model")
setp(AI_API_KEY="k",AI_PROVIDER="groq",AI_MODEL="llama-3.3-70b-versatile"); net=Net([chat_msg("hi")]); ask(net)
ok("AI_MODEL overrides the preset model",net.calls[0]["json"]["model"]=="llama-3.3-70b-versatile")
setp(ANTHROPIC_API_KEY="sk-ant-x",AI_API_KEY="k",AI_PROVIDER="groq"); ok("Anthropic key wins when both are set",AA.provider()=="anthropic")

# tool round trip + privacy
setp(AI_API_KEY="free-key-123",AI_PROVIDER="gemini")
net=Net([chat_msg(calls=[call("c1","driver_details",{"driver_id":did})]),chat_msg("Dana is approved.")]); r=ask(net); j=r.json()
ok("answers after a tool call",r.status_code==200 and j["reply"]=="Dana is approved." and j["tools_used"]==["driver_details"],r.text)
sent=net.calls[1]["json"]["messages"]; roles=[m["role"] for m in sent]
ok("messages follow the OpenAI shape (system, user, assistant tool_calls, tool)",roles==["system","user","assistant","tool"] and sent[2]["tool_calls"][0]["id"]=="c1" and sent[3]["tool_call_id"]=="c1",roles)
tool_text=sent[3]["content"]
ok("the real driver data reached the model",'"name": "Dana Driver"' in tool_text and '"approved": true' in tool_text,tool_text[:300])
ok("emails and phone numbers are masked before leaving the server","dana.driver@example.com" not in tool_text and "15551110000" not in tool_text and "d***@example.com" in tool_text,tool_text[:400])
net=Net([chat_msg(calls=[call("c1","driver_details",{"driver_id":did})]),chat_msg("ok")]); setp(AI_API_KEY="k",AI_PROVIDER="gemini",AI_REDACT_PII=False); ask(net)
ok("masking can be switched off",'dana.driver@example.com' in net.calls[1]["json"]["messages"][3]["content"])
setp(AI_API_KEY="k",AI_PROVIDER="gemini")
t=net.calls[0]["json"]["tools"]
ok("tools are sent as OpenAI functions without schema features some services reject",t[0]["type"]=="function" and all("additionalProperties" not in json.dumps(x) for x in t) and "parameters" not in [x for x in t if x["function"]["name"]=="platform_overview"][0]["function"],t[0])
net=Net([chat_msg(calls=[call("a","find_rides",{"status":"completed"}),call("b","list_withdrawals",{})]),chat_msg("done")]); ask(net)
ok("several tool calls in one turn are all answered",[m["tool_call_id"] for m in net.calls[1]["json"]["messages"] if m["role"]=="tool"]==["a","b"])
net=Net([chat_msg(calls=[{"id":"x","type":"function","function":{"name":"find_rides","arguments":"{not json"}}]),chat_msg("sorry")]); r=ask(net)
ok("broken tool arguments from a weak model do not crash",r.status_code==200 and "not valid JSON" in net.calls[1]["json"]["messages"][-1]["content"])
net=Net([chat_msg(calls=[call(str(i),"platform_overview",{})]) for i in range(AA.MAX_TOOL_TURNS+2)]); r=ask(net)
ok("endless tool use is stopped",r.status_code==200 and "too many lookups" in r.json()["reply"] and len(net.calls)==AA.MAX_TOOL_TURNS)
net=Net([chat_msg("partial",finish="length")]); r=ask(net); ok("a cut-off answer is flagged","cut short" in r.json()["reply"])
net=Net([chat_msg(None)]); r=ask(net); ok("an empty answer gets a friendly fallback",r.status_code==200 and "rephrasing" in r.json()["reply"])

# overload retry
setp(AI_API_KEY="k",AI_PROVIDER="gemini")
with mock.patch("time.sleep") as sl:
    net=Net([Resp(503,{"error":"busy"}),Resp(503,{"error":"busy"}),chat_msg("worked on the third try")]); r=ask(net)
    ok("a briefly overloaded service is retried",r.status_code==200 and r.json()["reply"]=="worked on the third try" and len(net.calls)==3 and sl.call_count==2,(r.text,len(net.calls)))
    net=Net([Resp(503,{"error":"busy"})]*3); r=ask(net)
    ok("gives up after three overloads with a safe message",r.status_code==502 and "busy" not in r.text and len(net.calls)==3,(r.text,len(net.calls)))
    net=Net([Resp(401,{"error":"bad"})]); r=ask(net); ok("a bad key is not retried",len(net.calls)==1)

# failures
net=Net([Resp(401,{"error":"bad key"})]); r=ask(net); ok("a rejected key gives a safe message",r.status_code==502 and "key was rejected" in r.text and "free-key" not in r.text,r.text)
net=Net([Resp(429,{"error":"slow down"})]); r=ask(net); ok("hitting the free limit says so",r.status_code==429 and "free limit" in r.text,r.text)
net=Net([Resp(500,{"error":"boom secret"})]); r=ask(net); ok("service errors never leak details",r.status_code==502 and "boom" not in r.text and "secret" not in r.text,r.text)
net=Net([requests.ConnectionError("dns failure k")]); r=ask(net); ok("network errors are handled",r.status_code==502 and "dns" not in r.text,r.text)
ok("no token is refused",c.post(A+"/admin/ai/chat",json={"messages":[{"role":"user","content":"hi"}]}).status_code in (401,403))
print(f"\n{sum(res)} passed, {len(res)-sum(res)} failed")
