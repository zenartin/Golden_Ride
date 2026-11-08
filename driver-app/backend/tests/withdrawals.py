"""Driver withdrawals: payout account, request, admin notification, approve/reject. Run from driver-app/backend: python tests/withdrawals.py"""
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
    from app.models.admin import Admin
    from app.models.admin_notification import AdminNotification
    from app.models.ride import Withdrawal
    from app.utils.security import get_password_hash
    db=SessionLocal(); db.add(Admin(email="a@example.com",name="Boss",password_hash=get_password_hash("Passw0rd!x"),role="super_admin")); db.commit(); db.close()
    at=c.post(A+"/admin/auth/login",json={"email":"a@example.com","password":"Passw0rd!x"}).json().get("access_token"); ok("admin login",bool(at))
    def setbal(v):
        db=SessionLocal(); d=db.get(Driver,did); d.balance=v; db.commit(); db.close()
    def drv(): 
        db=SessionLocal(); d=db.get(Driver,did); b=round(d.balance or 0,2); db.close(); return b
    setbal(100.0)
    r=c.post(A+"/driver/withdraw",headers=h(dt),data={"amount":"40"}); ok("withdraw refused with no bank account",r.status_code==400 and "bank" in r.text.lower(),r.text)
    r=c.put(A+"/driver/payout-account",headers=h(dt),json=dict(account_holder_name="D Driver",bank_name="Chase",routing_number="12345",account_number="000123456789")); ok("bad routing number refused",r.status_code==400,r.text)
    r=c.put(A+"/driver/payout-account",headers=h(dt),json=dict(account_holder_name="D Driver",bank_name="Chase",routing_number="021000021",account_number="000123456789")); j=r.json()
    ok("payout account saved, number masked",r.status_code==200 and j["complete"] and j["account_number_masked"].endswith("6789") and "000123" not in json.dumps(j) if (json:=__import__("json")) else 0,r.text)
    r=c.post(A+"/driver/withdraw",headers=h(dt),data={"amount":"0.5"}); ok("below minimum refused",r.status_code==400)
    r=c.post(A+"/driver/withdraw",headers=h(dt),data={"amount":"500"}); ok("more than balance refused",r.status_code==400)
    r=c.post(A+"/driver/withdraw",headers=h(dt),data={"amount":"40"}); wid=r.json().get("id")
    ok("withdrawal requested, balance reduced",r.status_code==200 and r.json()["status"]=="pending" and drv()==60.0,(r.text,drv()))
    n=c.get(A+"/admin/notifications",headers=h(at)).json()
    ok("admin notified",n["unread"]>=1 and any(x["kind"]=="withdrawal_request" and x["ref_id"]==wid for x in n["notifications"]),n)
    w=c.get(A+"/admin/withdrawals",headers=h(at)).json()
    row=next(x for x in w["withdrawals"] if x["id"]==wid)
    ok("admin sees request with account details",w["pending_count"]==1 and row["account_holder_name"]=="D Driver" and row["bank_name"]=="Chase" and row["routing_number"]=="021000021" and row["account_number"]=="000123456789" and row["driver_name"]=="D",row)
    ok("non-admin cannot see withdrawals",c.get(A+"/admin/withdrawals",headers=h(dt)).status_code in (401,403))
    r=c.post(A+f"/admin/withdrawals/{wid}/approve",headers=h(at),json={"reference":"ACH-123"}); ok("approve",r.status_code==200 and r.json()["status"]=="completed",r.text)
    ok("approve again refused",c.post(A+f"/admin/withdrawals/{wid}/approve",headers=h(at),json={}).status_code==400)
    h2=c.get(A+"/driver/earnings",headers=h(dt)).json()["withdrawals"]; x=next(i for i in h2 if i["id"]==wid)
    ok("driver sees paid + reference",x["status"]=="completed" and x["reference"]=="ACH-123",x)
    ok("approve keeps balance reduced",drv()==60.0)
    r=c.post(A+"/driver/withdraw",headers=h(dt),data={"amount":"25"}); w2=r.json()["id"]; ok("second request",r.status_code==200 and drv()==35.0)
    r=c.post(A+f"/admin/withdrawals/{w2}/reject",headers=h(at),json={}); ok("reject needs a reason",r.status_code==400)
    r=c.post(A+f"/admin/withdrawals/{w2}/reject",headers=h(at),json={"note":"Bank details do not match"}); ok("reject",r.status_code==200 and r.json()["status"]=="rejected",r.text)
    ok("reject returns the money",drv()==60.0,drv())
    x=next(i for i in c.get(A+"/driver/earnings",headers=h(dt)).json()["withdrawals"] if i["id"]==w2)
    ok("driver sees rejection reason",x["status"]=="rejected" and "match" in (x["admin_note"] or ""),x)
    c.post(A+"/admin/notifications/read-all",headers=h(at)); ok("mark all read",c.get(A+"/admin/notifications",headers=h(at)).json()["unread"]==0)
print(f"\n{np[0]} passed, {len(fails)} failed", fails)
sys.exit(1 if fails else 0)
