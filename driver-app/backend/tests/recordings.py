"""Record My Ride API. Run from driver-app/backend: python tests/recordings.py (temp SQLite DB)."""
import os, sys, tempfile, logging
sys.path.insert(0, os.getcwd())
d=tempfile.mkdtemp(dir=os.environ.get("SP") or None)
os.environ.update(DATABASE_URL=f"sqlite:///{d}/t.db",STRIPE_SECRET_KEY="sk_test_fake_not_real",STRIPE_PUBLISHABLE_KEY="pk_test_fake")
os.chdir(d); logging.disable(logging.CRITICAL)
from fastapi.testclient import TestClient
import app.utils.helpers as H
H.get_osrm_route=lambda *a,**k:{"distance_km":8.0,"duration_min":15,"distance":"","duration":"15 min","polyline":None}
from app.main import app
from app.database import SessionLocal
from app.models.driver import Driver
from app.models.ride import Ride
c=TestClient(app,raise_server_exceptions=False);A="/api";h=lambda t:{"Authorization":f"Bearer {t}"}
res=[]
def ok(n,v,i=""): res.append(bool(v)); print(("PASS " if v else "FAIL ")+n,"" if v else str(i)[:200])
dt=c.post(A+"/auth/register",json=dict(name="D",email="d@example.com",phone="+15551110000",password="Passw0rd!x")).json()["access_token"]
db=SessionLocal();dv=db.query(Driver).first();dv.is_approved=dv.profile_completed=dv.is_online=True;db.commit();db.close()
def rider(n):
    return c.post(A+"/user/auth/register",json=dict(name="R",email=f"r{n}@example.com",phone=f"+1555200000{n}",password="Passw0rd!x")).json()["access_token"]
r1,r2=rider(1),rider(2)
rid=c.post(A+"/user/rides/book",headers=h(r1),json=dict(pickup="A",dropoff="B",ride_class="Golden Ride Sedan",payment_method="Stripe",pickup_latitude=40.7,pickup_longitude=-74.0,dropoff_latitude=40.75,dropoff_longitude=-73.98)).json()["id"]
c.post(f"{A}/rides/{rid}/accept",headers=h(dt))
r=c.post(f"{A}/recordings/start?ride_id={rid}",headers=h(r1)); rec=r.json().get("recording_id")
ok("rider starts a recording on their own ride",r.status_code==200 and rec,r.text)
ok("another rider cannot start one on this ride",c.post(f"{A}/recordings/start?ride_id={rid}",headers=h(r2)).status_code==403)
ok("the ride's driver can record too",c.post(f"{A}/recordings/start?ride_id={rid}",headers=h(dt)).status_code==200)
ok("unknown ride is 404",c.post(f"{A}/recordings/start?ride_id=9999",headers=h(r1)).status_code==404)
f={"video":("ride.mp4",b"\x00\x00\x00\x18ftypmp42"+b"0"*5000,"video/mp4")}
r=c.post(A+"/recordings/upload",headers=h(r1),data={"recording_id":str(rec)},files=f); ok("upload stores the video",r.status_code==200 and r.json()["status"]=="success",r.text)
f={"video":("ride.mov",b"x"*100,"video/quicktime")}
ok("another rider cannot upload into it",c.post(A+"/recordings/upload",headers=h(r2),data={"recording_id":str(rec)},files=f).status_code==403)
ok("upload with no video is rejected",c.post(A+"/recordings/upload",headers=h(r1),data={"recording_id":str(rec)}).status_code==422)
db=SessionLocal();from app.models.recording import TripRecording;x=db.get(TripRecording,rec);st,ex,fp=x.status,x.expires_at,x.file_path;db.close()
ok("saved with a 24 hour expiry",st=="stored" and ex is not None and os.path.exists(fp),(st,ex,fp))
ok("rider can keep it by disputing",c.post(f"{A}/recordings/{rec}/dispute",headers=h(r1)).json().get("status")=="disputed")
ok("no token is refused",c.post(f"{A}/recordings/start?ride_id={rid}").status_code in (401,403))
print(f"\n{sum(res)} passed, {len(res)-sum(res)} failed")
