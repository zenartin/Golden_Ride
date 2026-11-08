"""Backend flow test, run from driver-app/backend: python tests/demo_card.py (mocks Stripe, uses a temp SQLite DB)."""
import os, sys, tempfile, logging, asyncio
from unittest import mock
sys.path.insert(0, os.getcwd())
d=tempfile.mkdtemp(dir=os.environ.get("SP") or None)
os.environ.update(DATABASE_URL=f"sqlite:///{d}/t.db",STRIPE_SECRET_KEY="sk_live_fake_not_real",ALLOW_DEMO_CARD="true",STRIPE_PUBLISHABLE_KEY="pk_test_fake")
os.chdir(d); logging.disable(logging.CRITICAL)
import stripe
from fastapi.testclient import TestClient
import app.utils.helpers as H
route={"km":8.05}
H.get_osrm_route=lambda *a,**k:{"distance_km":route["km"],"duration_min":15,"distance":"","duration":"15 min","polyline":None}
from app.main import app
from app.database import SessionLocal
from app.models.driver import Driver
from app.models.user import User
from app.models.ride import Ride
from app.services.ride_service import RideService as RS
from app.utils.pin import generate_ride_pin
creates=[];captures=[];cancels=[];refunds=[];decline={"on":False};n={"i":0}
class PI:
    def __init__(s,i,st): s.id=i;s.status=st
def fc(**k):
    creates.append(k)
    if decline["on"]: raise stripe.error.CardError("declined",None,"card_declined")
    n["i"]+=1; return PI(f"pi_{n['i']}","requires_capture" if k.get("capture_method")=="manual" else "succeeded")
c=TestClient(app,raise_server_exceptions=False);A="/api";h=lambda t:{"Authorization":f"Bearer {t}"}
fails=[];np=[0]
def ok(name,v,i=""):
    np[0]+=bool(v); print(("PASS " if v else "FAIL ")+name,"" if v else str(i)[:260],flush=True)
    if not v: fails.append(name)
dt=c.post(A+"/auth/register",json=dict(name="D",email="d@example.com",phone="+15551110000",password="Passw0rd!x")).json()["access_token"]
db=SessionLocal();dv=db.query(Driver).first();dv.is_approved=dv.profile_completed=dv.is_online=True;db.commit();did=dv.id;db.close()
num=[0]
def rider(card=True):
    num[0]+=1;e=f"r{num[0]}@example.com"
    t=c.post(A+"/user/auth/register",json=dict(name="R",email=e,phone=f"+1555200{num[0]:04d}",password="Passw0rd!x")).json()["access_token"]
    if card:
        db=SessionLocal();u=db.query(User).filter(User.email==e).first();u.stripe_customer_id="cus_x";u.stripe_payment_method_id="pm_1";u.card_brand="visa";u.card_last4="4242";db.commit();db.close()
    return t
CO=dict(pickup_latitude=40.7,pickup_longitude=-74.0,dropoff_latitude=40.75,dropoff_longitude=-73.98)
def book(t,pm="Stripe",rc="Golden Ride Sedan"): return c.post(A+"/user/rides/book",headers=h(t),json=dict(pickup="A St",dropoff="B Ave",ride_class=rc,payment_method=pm,**CO))
def R(i):
    db=SessionLocal();x=db.get(Ride,i);db.expunge(x);db.close();return x
def bal():
    db=SessionLocal();b=db.get(Driver,did).balance or 0;db.close();return round(b,2)
def st(i,s): return c.post(f"{A}/rides/{i}/status",headers=h(dt),json={"status":s})
def acc(i): return c.post(f"{A}/rides/{i}/accept",headers=h(dt))
def pin(i): return c.post(f"{A}/rides/{i}/verify-pin",headers=h(dt),json={"pin":generate_ride_pin(str(i))})
def reset(): creates.clear();captures.clear();cancels.clear();refunds.clear();decline["on"]=False
with mock.patch("stripe.PaymentIntent.create",side_effect=fc),mock.patch("stripe.PaymentIntent.capture",side_effect=lambda *a,**k:captures.append((a,k))),mock.patch("stripe.PaymentIntent.cancel",side_effect=lambda *a,**k:cancels.append(a)),mock.patch("stripe.Refund.create",side_effect=lambda **k:refunds.append(k)),mock.patch("stripe.PaymentMethod.retrieve"),mock.patch("stripe.PaymentMethod.detach"):
    def pay(t,i,m="card"): return c.post(f"{A}/user/rides/{i}/pay",headers=h(t),json={"payment_method":m})
    ok("config advertises demo card",c.get(A+"/payments/config").json().get("demo_card_enabled") is True)
    t=rider(False); r=c.post(A+"/user/card/demo",headers=h(t))
    ok("add demo card",r.status_code==200 and r.json().get("card_last4")=="4242",r.text)
    ok("profile shows saved card",c.get(A+"/user/profile",headers=h(t)).json().get("has_payment_method") is True)
    reset(); b0=bal(); i=book(t).json()["id"]; acc(i); st(i,"arrived")
    r=pay(t,i); x=R(i)
    ok("pay with demo card: no Stripe call, authorized",r.status_code==200 and not creates and x.payment_status=="authorized",(r.text[:160],creates,x.payment_status))
    ok("PIN revealed",len(c.get(f"{A}/user/rides/{i}",headers=h(t)).json().get("verification_pin") or "")==4)
    ok("PIN + start + complete",pin(i).status_code==200 and st(i,"started").status_code==200 and st(i,"completed").status_code==200)
    x=R(i); ok("demo ride finishes paid, nothing captured at Stripe",x.status=="completed" and x.payment_status=="paid" and not captures,(x.status,x.payment_status,captures))
    ok("driver still credited 80%",round(bal()-b0,2)==round(x.fare_amount*.8,2))
    # a real card (non-demo) still goes through Stripe
    reset(); t2=rider(True); i=book(t2).json()["id"]; acc(i); r=pay(t2,i)
    ok("real card still charged via Stripe",r.status_code==200 and len(creates)==1 and creates[0]["payment_method"]=="pm_1",creates)
    # client cannot fake a demo id through /card/save when demo is off -> checked by unit below
    from app.core.config import settings
    from app.services import stripe_service as SS
    settings.ALLOW_DEMO_CARD=False
    ok("demo id ignored when ALLOW_DEMO_CARD is off",SS.is_demo_method("pm_mock_demo") is False)
    ok("endpoint refuses when off",c.post(A+"/user/card/demo",headers=h(rider(False))).status_code==403)
    reset(); i=book(t).json()["id"]; acc(i); r=pay(t,i)
    ok("leftover demo card cannot pay when off (goes to Stripe, fails here)",len(creates)==1 or r.status_code==400,(r.status_code,creates))
print(f"\n{np[0]} passed, {len(fails)} failed", fails)
sys.exit(1 if fails else 0)
