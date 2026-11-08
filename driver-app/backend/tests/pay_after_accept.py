"""Backend flow test, run from driver-app/backend: python tests/pay_after_accept.py (mocks Stripe, uses a temp SQLite DB)."""
import os, sys, tempfile, logging, asyncio
from unittest import mock
sys.path.insert(0, os.getcwd())
d=tempfile.mkdtemp(dir=os.environ.get("SP") or None)
os.environ.update(DATABASE_URL=f"sqlite:///{d}/t.db",STRIPE_SECRET_KEY="sk_test_fake_not_real",STRIPE_PUBLISHABLE_KEY="pk_test_fake")
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
    def ride_json(t,i): return c.get(f"{A}/user/rides/{i}",headers=h(t)).json()
    # booking: no card needed, nothing charged, no PIN shown
    reset(); t=rider(False); r=book(t); i=r.json()["id"]
    ok("booking works with no card, no charge",r.status_code==201 and not creates and R(i).payment_status=="unpaid",(r.text[:200],creates,R(i).payment_status))
    ok("PIN hidden before payment",not ride_json(t,i).get("verification_pin"))
    ok("cannot pay before a driver accepts",pay(t,i).status_code==400)
    ok("accept",acc(i).status_code==200)
    ok("PIN still hidden after accept",not ride_json(t,i).get("verification_pin"))
    ok("arrived",st(i,"arrived").status_code==200)
    r=pin(i); ok("driver cannot verify PIN before payment",r.status_code==400 and "paid" in r.text.lower(),r.text)
    r=st(i,"started"); ok("start refused before payment",r.status_code==400,r.text)
    r=pay(t,i); ok("pay with no card asks to add one",r.status_code==400 and "card" in r.text.lower() and not creates,r.text)
    # card pay
    reset(); t=rider(True); i=book(t).json()["id"]; acc(i); st(i,"arrived")
    ok("still nothing charged after accept",not creates)
    r=pay(t,i); x=R(i)
    ok("paying places the hold",r.status_code==200 and len(creates)==1 and creates[0]["capture_method"]=="manual" and x.payment_status=="authorized",(r.text[:200],creates,x.payment_status))
    ok("PIN revealed after payment",len(ride_json(t,i).get("verification_pin") or "")==4)
    ok("pay twice is harmless",pay(t,i).status_code==200 and len(creates)==1)
    ok("right PIN accepted after payment",pin(i).status_code==200)
    b0=bal(); ok("start after PIN",st(i,"started").status_code==200)
    ok("complete",st(i,"completed").status_code==200)
    x=R(i); ok("captured at completion, paid",len(captures)==1 and x.payment_status=="paid" and x.status=="completed",(captures,x.status,x.payment_status))
    ok("driver credited 80%",round(bal()-b0,2)==round(x.fare_amount*.8,2),bal()-b0)
    # declined card
    reset(); t=rider(True); i=book(t).json()["id"]; acc(i); decline["on"]=True
    r=pay(t,i); ok("declined card: pay fails, ride stays unpaid",r.status_code==400 and R(i).payment_status=="unpaid",(r.text,R(i).payment_status)); decline["on"]=False
    ok("declined: trip cannot start",st(i,"arrived").status_code==200 and st(i,"started").status_code==400)
    # wallet
    t=rider(False); db=SessionLocal();u=db.query(User).filter(User.email=="r%d@example.com"%num[0]).first();u.wallet_balance=500.0;db.commit();db.close()
    i=book(t,pm="Wallet").json()["id"]; acc(i)
    ok("wallet not debited at booking",c.get(A+"/user/profile",headers=h(t)).json()["wallet_balance"]==500.0)
    r=pay(t,i,"wallet"); x=R(i); w=c.get(A+"/user/profile",headers=h(t)).json()["wallet_balance"]
    ok("wallet payment debits fare and unlocks PIN",r.status_code==200 and x.payment_status=="wallet_paid" and round(500-w,2)==round(x.fare_amount,2) and len(ride_json(t,i).get("verification_pin") or "")==4,(r.text[:200],w))
    c.post(f"{A}/user/rides/{i}/cancel",headers=h(t),json={})
    w2=c.get(A+"/user/profile",headers=h(t)).json()["wallet_balance"]
    ok("cancel after wallet payment refunds wallet",w2==500.0 and R(i).payment_status=="refunded",(w2,R(i).payment_status))
    t=rider(False); db=SessionLocal();u=db.query(User).filter(User.email=="r%d@example.com"%num[0]).first();u.wallet_balance=0.5;db.commit();db.close()
    i=book(t,pm="Wallet").json()["id"]; acc(i); r=pay(t,i,"wallet"); ok("insufficient wallet refused",r.status_code==400 and R(i).payment_status=="unpaid",r.text)
    # cancel before paying: nothing to release
    reset(); t=rider(True); i=book(t).json()["id"]; acc(i); c.post(f"{A}/user/rides/{i}/cancel",headers=h(t),json={})
    ok("cancel before paying: no release, no refund",not cancels and not refunds and not creates and R(i).status=="cancelled")
    # cancel after card pay releases hold
    reset(); t=rider(True); i=book(t).json()["id"]; acc(i); pay(t,i); reset(); c.post(f"{A}/user/rides/{i}/cancel",headers=h(t),json={})
    ok("cancel after paying releases the hold",len(cancels)==1 and R(i).payment_status=="released",(cancels,R(i).payment_status))
    # someone else cannot pay
    t1=rider(True); t2=rider(True); i=book(t1).json()["id"]; acc(i); ok("other rider cannot pay my ride",pay(t2,i).status_code==400)
print(f"\n{np[0]} passed, {len(fails)} failed", fails)
sys.exit(1 if fails else 0)
