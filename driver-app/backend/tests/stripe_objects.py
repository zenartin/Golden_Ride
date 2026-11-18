"""Stripe library objects are not dicts. Admin Payments page + webhook with REAL Stripe objects. Run from driver-app/backend: python tests/stripe_objects.py"""
import os, sys, tempfile, logging, json
from unittest import mock
sys.path.insert(0, os.getcwd())
d=tempfile.mkdtemp(dir=os.environ.get("SP") or None)
os.environ.update(DATABASE_URL=f"sqlite:///{d}/t.db",STRIPE_SECRET_KEY="sk_test_fake_not_real",STRIPE_PUBLISHABLE_KEY="pk_test_fake")
os.chdir(d); logging.disable(logging.CRITICAL)
import stripe
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.database import SessionLocal
from app.models.admin import Admin
from app.models.payment import Payment
from app.models.user import User
from app.utils.security import get_password_hash
from app.utils.stripe_compat import as_dict
c=TestClient(app,raise_server_exceptions=False);A="/api";h=lambda t:{"Authorization":f"Bearer {t}"}
res=[]
def ok(n,v,i=""): res.append(bool(v)); print(("PASS " if v else "FAIL ")+n,"" if v else str(i)[:300])
K="sk_test_fake_not_real"
sample=stripe.Charge.construct_from({"id":"ch_1","object":"charge"},K)
try: sample.get("x"); reproduces=False
except Exception: reproduces=True
ok("test objects behave like the real library (no .get on a Charge)",reproduces)

db=SessionLocal(); db.add(Admin(email="a@example.com",name="Boss",password_hash=get_password_hash("Passw0rd!x"),role="super_admin"))
u=User(name="R",email="r@example.com",phone="+15552000001",password_hash=get_password_hash("x")); db.add(u); db.commit(); uid=u.id
db.add(Payment(payment_id="pay_1",payment_intent_id="pi_1",user_id=uid,amount=25.0,payment_status="pending"))
db.add(Payment(payment_id="pay_2",payment_intent_id="pi_2",user_id=uid,amount=40.0,payment_status="succeeded"))
db.commit(); db.close()
at=c.post(A+"/admin/auth/login",json={"email":"a@example.com","password":"Passw0rd!x"}).json().get("access_token")

bal=stripe.Balance.construct_from({"object":"balance","available":[{"amount":611,"currency":"usd"},{"amount":500,"currency":"eur"}],"pending":[{"amount":250,"currency":"usd"}]},K)
charges=stripe.ListObject.construct_from({"object":"list","data":[
  {"id":"ch_1","object":"charge","amount":2500,"currency":"usd","status":"succeeded","created":1700000000,"receipt_url":"https://pay.stripe.com/receipts/1"},
  {"id":"ch_2","object":"charge","amount":900,"currency":"usd","status":"failed","created":1700000100}]},K)
with mock.patch("stripe.Balance.retrieve",return_value=bal),mock.patch("stripe.Charge.list",return_value=charges):
    r=c.get(A+"/admin/stripe-dashboard",headers=h(at)); j=r.json()
ok("Payments page loads",r.status_code==200,r.text)
ok("live Stripe data is no longer reported as unavailable",j["stripe"]["connected"] is True and j["stripe"]["error"] is None,j["stripe"])
ok("Stripe balance shown in dollars (usd only)",j["balance"]=={"available":6.11,"pending":2.5},j["balance"])
ok("recent charges listed with receipt links",len(j["recent_charges"])==2 and j["recent_charges"][0]["receipt_url"]=="https://pay.stripe.com/receipts/1" and j["recent_charges"][1]["receipt_url"] is None and j["recent_charges"][0]["amount"]==25.0,j["recent_charges"])
ok("platform numbers still shown",j["summary"]["online_payments"]==1 and j["summary"]["total_collected"]==40.0,j["summary"])
with mock.patch("stripe.Balance.retrieve",side_effect=stripe.error.AuthenticationError("bad key")):
    j=c.get(A+"/admin/stripe-dashboard",headers=h(at)).json()
ok("a real Stripe failure still falls back to platform data",j["stripe"]["connected"] is False and j["stripe"]["error"] and j["summary"]["total_collected"]==40.0,j["stripe"])

def hook(evt):
    settings.STRIPE_WEBHOOK_SECRET="whsec_test"
    with mock.patch("stripe.Webhook.construct_event",return_value=stripe.Event.construct_from(evt,K)):
        return c.post(A+"/payments/webhook",content=json.dumps(evt),headers={"stripe-signature":"t=1,v1=x"})
r=hook({"id":"evt_1","object":"event","type":"payment_intent.succeeded","data":{"object":{"id":"pi_1","object":"payment_intent","payment_method":"pm_9","charges":{"data":[{"receipt_url":"https://pay.stripe.com/receipts/9"}]}}}})
db=SessionLocal(); p=db.query(Payment).filter(Payment.payment_intent_id=="pi_1").first(); st,pm,ru=p.payment_status,p.payment_method,p.receipt_url; db.close()
ok("webhook: payment succeeded is recorded",r.status_code==200 and st=="succeeded" and pm=="pm_9" and ru=="https://pay.stripe.com/receipts/9",(r.status_code,st,pm,ru))
r=hook({"id":"evt_2","object":"event","type":"payment_intent.succeeded","data":{"object":{"id":"pi_1","object":"payment_intent"}}})
ok("webhook: succeeded event without charge details does not crash",r.status_code==200,r.text)
r=hook({"id":"evt_3","object":"event","type":"charge.refunded","data":{"object":{"id":"ch_1","object":"charge","payment_intent":"pi_2","refunded":True}}})
db=SessionLocal(); p=db.query(Payment).filter(Payment.payment_intent_id=="pi_2").first(); st,rs=p.payment_status,p.refund_status; db.close()
ok("webhook: refund is recorded",r.status_code==200 and st=="refunded" and rs=="full",(st,rs))
r=hook({"id":"evt_4","object":"event","type":"payment_intent.payment_failed","data":{"object":{"id":"pi_1","object":"payment_intent"}}})
db=SessionLocal(); st=db.query(Payment).filter(Payment.payment_intent_id=="pi_1").first().payment_status; db.close()
ok("webhook: failed payment is recorded",r.status_code==200 and st=="failed",st)
r=hook({"id":"evt_5","object":"event","type":"customer.created","data":{"object":{"id":"cus_1","object":"customer"}}}); ok("webhook: unrelated events are accepted",r.status_code==200)
ok("as_dict leaves plain data alone",as_dict({"a":1})=={"a":1} and as_dict([1])==[1] and as_dict(None) is None and as_dict("x")=="x")
print(f"\n{sum(res)} passed, {len(res)-sum(res)} failed")
