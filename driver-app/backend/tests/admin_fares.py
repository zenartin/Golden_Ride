"""Admin fare settings drive quotes and bookings. Run from driver-app/backend: python tests/admin_fares.py"""
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
    import json
    from app.models.app_setting import AppSetting
    def quote(t,rc="Golden Ride Sedan"):
        o=c.post(A+"/user/rides/options",headers=h(t),json=dict(pickup="A",dropoff="B",**CO)).json()["options"]
        return next(x for x in o if x["id"]==rc)
    def setv(**kw):
        db=SessionLocal()
        for k,v in kw.items():
            r=db.query(AppSetting).filter(AppSetting.key==k).first()
            if r: r.value=json.dumps(v)
            else: db.add(AppSetting(key=k,value=json.dumps(v)))
        db.commit(); db.close()
    t=rider(True)
    q=quote(t); ok("default Sedan fare unchanged ($9.68)",q["price"]==9.68,q)
    ok("quote carries the rates for the app",q["breakdown"]["per_mile"]==0.885 and q["breakdown"]["minimum_fare"]==4.0,q["breakdown"])
    setv(base_fare=5.0,per_mile=2.0,per_minute=0.5,booking_fee=1.0,minimum_fare=10.0,mult_suv=2.0)
    miles=8.05/1.609344; exp=round(5+miles*2+15*0.5+1,2)
    q=quote(t); ok("admin rates change the Sedan quote",q["price"]==exp,(q["price"],exp))
    qs=quote(t,"Golden Ride SUV"); ok("admin multiplier changes SUV quote",qs["price"]==round((5+miles*2+15*0.5+1)*2,2),(qs["price"],exp*2))
    ok("breakdown shows admin values",q["breakdown"]["base_fare"]==5.0 and qs["breakdown"]["ride_type_multiplier"]==2.0,qs["breakdown"])
    i=book(t).json()["id"]; ok("booked fare equals the quote",R(i).fare_amount==exp,(R(i).fare_amount,exp))
    setv(minimum_fare=50.0); ok("minimum fare applies",quote(t)["price"]==50.0,quote(t))
    from app.routers import admin as AD
    db=SessionLocal(); s=AD._load_settings(db); db.close()
    ok("admin settings expose the fare keys",all(k in s for k in ("base_fare","per_mile","per_minute","booking_fee","minimum_fare","mult_sedan","mult_xl")),list(s))
print(f"\n{np[0]} passed, {len(fails)} failed", fails)
sys.exit(1 if fails else 0)
