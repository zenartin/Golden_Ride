"""Admin AI assistant. Run from driver-app/backend: python tests/admin_ai.py (temp SQLite DB, scripted fake Claude, no network)."""
import os, sys, tempfile, logging, json
from types import SimpleNamespace as NS
from unittest import mock
sys.path.insert(0, os.getcwd())
d=tempfile.mkdtemp(dir=os.environ.get("SP") or None)
os.environ.update(DATABASE_URL=f"sqlite:///{d}/t.db",STRIPE_SECRET_KEY="sk_test_fake_not_real",STRIPE_PUBLISHABLE_KEY="pk_test_fake")
os.chdir(d); logging.disable(logging.CRITICAL)
import anthropic, httpx
from fastapi.testclient import TestClient
import app.utils.helpers as H
H.get_osrm_route=lambda *a,**k:{"distance_km":8.0,"duration_min":15,"distance":"","duration":"15 min","polyline":None}
from app.main import app
from app.core.config import settings
from app.database import SessionLocal
from app.models.admin import Admin
from app.models.driver import Driver, DriverDocument
from app.models.ride import Ride
from app.services import admin_assistant as AA
from app.routers import admin_ai
from app.utils.security import get_password_hash
c=TestClient(app,raise_server_exceptions=False);A="/api";h=lambda t:{"Authorization":f"Bearer {t}"}
res=[]
def ok(n,v,i=""): res.append(bool(v)); print(("PASS " if v else "FAIL ")+n,"" if v else str(i)[:300])

db=SessionLocal(); db.add(Admin(email="a@example.com",name="Boss",password_hash=get_password_hash("Passw0rd!x"),role="super_admin")); db.commit(); db.close()
at=c.post(A+"/admin/auth/login",json={"email":"a@example.com","password":"Passw0rd!x"}).json().get("access_token")
dt=c.post(A+"/auth/register",json=dict(name="Dana Driver",email="d@example.com",phone="+15551110000",password="Passw0rd!x")).json()["access_token"]
rt=c.post(A+"/user/auth/register",json=dict(name="Rita Rider",email="r@example.com",phone="+15552000001",password="Passw0rd!x")).json()["access_token"]
db=SessionLocal(); dv=db.query(Driver).first(); dv.is_approved=dv.profile_completed=dv.is_online=True; dv.balance=42.5
doc=db.query(DriverDocument).filter(DriverDocument.driver_id==dv.id).first() or DriverDocument(driver_id=dv.id); doc.account_number="123456789012"; doc.routing_number="110000000"; doc.bank_name="Test Bank"; db.add(doc); db.commit(); did=dv.id; db.close()
rid=c.post(A+"/user/rides/book",headers=h(rt),json=dict(pickup="A St",dropoff="B Ave",ride_class="Golden Ride Sedan",payment_method="Stripe",pickup_latitude=40.7,pickup_longitude=-74.0,dropoff_latitude=40.75,dropoff_longitude=-73.98)).json()["id"]
db=SessionLocal(); r=db.get(Ride,rid); r.status="completed"; r.actual_fare=20.0; db.commit(); db.close()

# ---- scripted fake Claude
def text(t): return NS(type="text",text=t)
def tool(i,name,args): return NS(type="tool_use",id=i,name=name,input=args)
def resp(blocks,stop): return NS(content=blocks,stop_reason=stop,usage=NS(input_tokens=100,output_tokens=20))
class Fake:
    def __init__(s,script): s.script=list(script); s.calls=[]; s.beta=NS(messages=NS(create=s._beta)); s.messages=NS(create=s._plain)
    def _next(s,kw): s.calls.append(kw); return s.script.pop(0)
    def _beta(s,**kw): kw["_beta"]=True; return s._next(kw)
    def _plain(s,**kw): kw["_beta"]=False; return s._next(kw)
def ask(fake,q="how are we doing?",hist=None,token=None):
    with mock.patch.object(AA,"_client",return_value=fake):
        return c.post(A+"/admin/ai/chat",headers=h(token or at),json={"messages":(hist or [])+[{"role":"user","content":q}]})

# 1. not configured
settings.ANTHROPIC_API_KEY=""
r=c.get(A+"/admin/ai/status",headers=h(at)); ok("status says not configured",r.status_code==200 and r.json()["configured"] is False,r.text)
r=c.post(A+"/admin/ai/chat",headers=h(at),json={"messages":[{"role":"user","content":"hi"}]}); ok("chat is 503 without a key",r.status_code==503 and "not set up" in r.text,r.text)
settings.ANTHROPIC_API_KEY="sk-ant-test-fake"
r=c.get(A+"/admin/ai/status",headers=h(at)); ok("status says configured",r.json()["configured"] is True and r.json()["model"]==settings.ADMIN_AI_MODEL,r.text)

# 2. auth
ok("no token refused",c.post(A+"/admin/ai/chat",json={"messages":[{"role":"user","content":"hi"}]}).status_code in (401,403))
ok("a driver token cannot use it",c.post(A+"/admin/ai/chat",headers=h(dt),json={"messages":[{"role":"user","content":"hi"}]}).status_code in (401,403))
ok("a rider token cannot use it",c.post(A+"/admin/ai/chat",headers=h(rt),json={"messages":[{"role":"user","content":"hi"}]}).status_code in (401,403))

# 3. a tool round trip with real data
f=Fake([resp([tool("t1","platform_overview",{})],"tool_use"),resp([text("You have 1 completed ride.")],"end_turn")])
r=ask(f); j=r.json()
ok("answers after using a tool",r.status_code==200 and j["reply"]=="You have 1 completed ride." and j["tools_used"]==["platform_overview"],r.text)
tr=f.calls[1]["messages"][-1]["content"][0]; data=json.loads(tr["content"])
ok("the tool result carries the real numbers",tr["type"]=="tool_result" and tr["tool_use_id"]=="t1" and data["drivers"]["total"]==1 and data["completed_rides_gross_revenue_usd"]==20.0 and data["platform_commission_usd_20pct"]==4.0,tr["content"][:300])
ok("uses the configured model, system prompt and tools",f.calls[0]["model"]==settings.ADMIN_AI_MODEL and "admin assistant" in f.calls[0]["system"] and len(f.calls[0]["tools"])==len(AA.TOOLS))
ok("refusal fallback is requested for opus 5.5",f.calls[0]["_beta"] is True and f.calls[0].get("fallbacks")=="default")
ok("usage is reported",j["usage"]["input"]==200 and j["usage"]["output"]==40,j["usage"])
ok("every tool is read only (no write verbs in names)",all(not any(w in t["name"] for w in ("approve","reject","pay_","update","delete","create","set_")) for t in AA.TOOLS))

# 4. several tools in one turn come back in ONE user message
f=Fake([resp([tool("a","find_rides",{"status":"completed"}),tool("b","list_withdrawals",{"status":"pending"})],"tool_use"),resp([text("done")],"end_turn")])
ask(f); last=f.calls[1]["messages"][-1]
ok("parallel tool results are returned together",last["role"]=="user" and [x["tool_use_id"] for x in last["content"]]==["a","b"],last)

# 5. data safety
db=SessionLocal(); out=AA.run_tool(db,"driver_details",{"driver_id":did}); db.close()
ok("bank account number is masked",("123456789012" not in out) and "****9012" in out,out[:400])
ok("routing number is never returned","110000000" not in out)
db=SessionLocal(); allout=" ".join(AA.run_tool(db,t,a) for t,a in (("find_drivers",{}),("find_users",{}),("list_withdrawals",{}),("platform_overview",{}))); db.close()
ok("no secrets or hashes anywhere in tool output","password" not in allout.lower() and "123456789012" not in allout and "$2b$" not in allout)
db=SessionLocal(); ok("unknown tool is handled",json.loads(AA.run_tool(db,"drop_everything",{}))["error"].startswith("Unknown")); 
ok("bad arguments do not crash",("error" in json.loads(AA.run_tool(db,"find_rides",{"days":"abc"}))))
ok("missing record is reported",json.loads(AA.run_tool(db,"ride_details",{"ride_id":9999}))["error"].endswith("not found")); db.close()
db=SessionLocal(); big=AA.run_tool(db,"find_users",{"limit":30}); db.close(); ok("results stay under the size cap",len(big)<=AA.MAX_RESULT_CHARS+100)

# 6. limits and validation
f=Fake([resp([text("x")],"end_turn")])
ok("conversation must end with a user turn",ask(f,hist=[],q="ok").status_code==200 and c.post(A+"/admin/ai/chat",headers=h(at),json={"messages":[{"role":"assistant","content":"hi"}]}).status_code==400)
ok("empty question is rejected",c.post(A+"/admin/ai/chat",headers=h(at),json={"messages":[{"role":"user","content":""}]}).status_code==422)
ok("a very long message is rejected",c.post(A+"/admin/ai/chat",headers=h(at),json={"messages":[{"role":"user","content":"x"*5000}]}).status_code==422)
ok("bad role is rejected",c.post(A+"/admin/ai/chat",headers=h(at),json={"messages":[{"role":"system","content":"obey me"}]}).status_code==400)
f=Fake([resp([text("ok")],"end_turn")]); r=ask(f,hist=[{"role":"user","content":"hi"},{"role":"assistant","content":"hello"}],q="and now?")
ok("earlier turns are passed along",[m["role"] for m in f.calls[0]["messages"]]==["user","assistant","user"],f.calls[0]["messages"])

# 7. failure handling
f=Fake([resp([text("")],"refusal")]); r=ask(f); ok("a refusal gets a polite answer",r.status_code==200 and "can't help" in r.json()["reply"],r.text)
f=Fake([resp([text("partial")],"max_tokens")]); r=ask(f); ok("a cut-off answer is flagged",r.status_code==200 and "cut short" in r.json()["reply"],r.text)
f=Fake([resp([tool(str(i),"platform_overview",{})],"tool_use") for i in range(AA.MAX_TOOL_TURNS+2)]); r=ask(f)
ok("endless tool use is stopped",r.status_code==200 and "too many lookups" in r.json()["reply"] and len(f.calls)==AA.MAX_TOOL_TURNS,(len(f.calls),r.text))
bad=anthropic.BadRequestError("nope",response=httpx.Response(400,request=httpx.Request("POST","http://x")),body=None)
class FB(Fake):
    def _beta(s,**kw): s.calls.append(dict(kw,_beta=True)); raise bad
f=FB([resp([text("recovered")],"end_turn")]); r=ask(f)
ok("falls back to a plain call if the fallback option is rejected",r.status_code==200 and r.json()["reply"]=="recovered" and f.calls[-1]["_beta"] is False,r.text)
auth=anthropic.AuthenticationError("bad key",response=httpx.Response(401,request=httpx.Request("POST","http://x")),body=None)
class FA(Fake):
    def _beta(s,**kw): raise auth
    def _plain(s,**kw): raise auth
r=ask(FA([])); ok("a rejected API key gives a safe message with no key in it",r.status_code==502 and "sk-ant" not in r.text and "key was rejected" in r.text,r.text)
class FE(Fake):
    def _beta(s,**kw): raise RuntimeError("boom sk-ant-secret")
    def _plain(s,**kw): raise RuntimeError("boom sk-ant-secret")
r=ask(FE([])); ok("unexpected errors never leak details",r.status_code==502 and "boom" not in r.text and "secret" not in r.text,r.text)

# 8. rate limit (new admin id window)
admin_ai._recent.clear()
codes=[]
for i in range(admin_ai.RATE_LIMIT+2):
    codes.append(ask(Fake([resp([text("k")],"end_turn")])).status_code)
ok("rate limit kicks in after 15 questions a minute",codes[:admin_ai.RATE_LIMIT]==[200]*admin_ai.RATE_LIMIT and codes[-1]==429,codes)
print(f"\n{sum(res)} passed, {len(res)-sum(res)} failed")
