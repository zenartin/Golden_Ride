"""Run from driver-app/backend: python tests/radius_filter.py (temp SQLite DB). Driver radius filter: 5 km / 10 km / all requests."""
import os, sys, tempfile, logging, datetime
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
c=TestClient(app,raise_server_exceptions=False);A="/api";h=lambda t:{"Authorization":f"Bearer {t}"}
res=[]
def ok(n,v,i=""): res.append(bool(v)); print(("PASS " if v else "FAIL ")+n,"" if v else str(i)[:200])
dt=c.post(A+"/auth/register",json=dict(name="D",email="d@example.com",phone="+15551110000",password="Passw0rd!x")).json()["access_token"]
def setdrv(**k):
    db=SessionLocal();x=db.query(Driver).first()
    for a,b in k.items(): setattr(x,a,b)
    db.commit();db.close()
setdrv(is_approved=True,profile_completed=True,is_online=True)
rt=c.post(A+"/user/auth/register",json=dict(name="R",email="r@example.com",phone="+15552000001",password="Passw0rd!x")).json()["access_token"]
PU=(40.7000,-74.0000)  # pickup
def km(dy): return 40.7+dy/111.0   # north of the pickup by dy km
def book():
    r=c.post(A+"/user/rides/book",headers=h(rt),json=dict(pickup="A",dropoff="B",ride_class="Golden Ride Sedan",payment_method="Stripe",pickup_latitude=PU[0],pickup_longitude=PU[1],dropoff_latitude=40.75,dropoff_longitude=-73.98))
    return r.json()["id"]
rid=book()
def listed(lat=None,lng=None):
    p={} if lat is None else {"lat":lat,"lng":lng}
    r=c.get(A+"/rides/requests",headers=h(dt),params=p); return [x["id"] for x in r.json()] if r.status_code==200 else r.text
for radius,dist,want in [(5,2,True),(5,4.8,True),(5,5.5,False),(5,7,False),(5,12,False),(10,7,True),(10,9.5,True),(10,10.6,False),(10,12,False),(0,12,True),(0,300,True)]:
    setdrv(radius_filter=radius)
    got=rid in listed(km(dist),PU[1])
    ok(f"radius {radius or 'all'} km, pickup {dist} km away -> {'shown' if want else 'hidden'}",got==want,got)
setdrv(radius_filter=5,latitude=PU[0]+0.001,longitude=PU[1],location_updated_at=None)
ok("radius 5 with no recent driver location hides requests (cannot confirm distance)", rid not in listed())
setdrv(radius_filter=5,latitude=km(2),longitude=PU[1],location_updated_at=datetime.datetime.utcnow()-datetime.timedelta(minutes=30))
ok("radius 5 with a 30-minute-old location hides requests", rid not in listed())
setdrv(radius_filter=5,latitude=km(2),longitude=PU[1],location_updated_at=datetime.datetime.utcnow())
ok("radius 5 with a fresh location shows a near request", rid in listed())
# accept enforcement
setdrv(radius_filter=5,latitude=km(8),longitude=PU[1],location_updated_at=datetime.datetime.utcnow())
r=c.post(f"{A}/rides/{rid}/accept",headers=h(dt)); ok("accept refused when pickup is 8 km away and radius is 5",r.status_code==400 and "radius" in r.text,r.text)
setdrv(radius_filter=10)
r=c.post(f"{A}/rides/{rid}/accept",headers=h(dt)); ok("same ride accepted once radius is 10",r.status_code==200,r.text)
print(f"\n{sum(res)} passed, {len(res)-sum(res)} failed")
