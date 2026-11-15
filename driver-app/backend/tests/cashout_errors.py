"""Run from driver-app/backend: python tests/cashout_errors.py"""
import os, sys, tempfile, logging
from unittest import mock
sys.path.insert(0, os.getcwd())
d=tempfile.mkdtemp(dir=os.environ.get("SP") or None)
os.environ.update(DATABASE_URL=f"sqlite:///{d}/t.db",STRIPE_SECRET_KEY="sk_test_fake_not_real",STRIPE_PUBLISHABLE_KEY="pk_test_fake")
os.chdir(d); logging.disable(logging.CRITICAL)
import stripe
from fastapi.testclient import TestClient
from app.main import app
from app.services import stripe_service
c=TestClient(app,raise_server_exceptions=False);A="/api"
t=c.post(A+"/auth/register",json=dict(name="D",email="d@example.com",phone="+15551110000",password="Passw0rd!x")).json()["access_token"]
h={"Authorization":f"Bearer {t}"}
res=[]
def ok(n,v,i=""): res.append(bool(v)); print(("PASS " if v else "FAIL ")+n,"" if v else str(i)[:200])
with mock.patch.object(stripe_service,"is_mock",return_value=False), mock.patch("stripe.Account.create",side_effect=stripe.error.InvalidRequestError("You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect.",None)):
    r=c.post(A+"/driver/payout/connect",headers=h,json={}); ok("Connect not enabled gives a clear message",r.status_code==503 and "not available yet" in r.text and "bank" in r.text,r.text)
with mock.patch.object(stripe_service,"is_mock",return_value=False), mock.patch("stripe.Account.create",side_effect=RuntimeError("network down")):
    r=c.post(A+"/driver/payout/connect",headers=h,json={}); ok("other failures suggest retry or bank withdrawal",r.status_code==502 and "bank" in r.text,r.text)
print(f"\n{sum(res)} passed, {len(res)-sum(res)} failed")
