"""Run from driver-app/backend: python tests/destination_mode.py (pure logic, no DB)."""
import os, sys
sys.path.insert(0, os.getcwd())
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
from app.utils.helpers import is_ride_eligible_for_destination_mode as ok
# Driver in Midtown Manhattan, destination = Newark Airport area (EWR)
DRV=(40.7549,-73.9840); DEST=(40.6895,-74.1745)
def ride(p,d): return ok(DRV[0],DRV[1],DEST[0],DEST[1],p[0],p[1],d[0],d[1])
res=[]
def t(name,got,want): res.append(got==want); print(("PASS " if got==want else "FAIL ")+name, "" if got==want else f"(got {got})")
t("ride to the exact destination", ride((40.7580,-73.9855),DEST), True)
t("ride to ~3 km from destination", ride((40.7580,-73.9855),(40.7100,-74.1500)), True)
t("ride to ~8 km from destination (nearby)", ride((40.7580,-73.9855),(40.7300,-74.0700)), True)
t("far pickup (Brooklyn) to the destination", ride((40.6782,-73.9442),DEST), True)
t("on the way: Midtown -> Jersey City", ride((40.7580,-73.9855),(40.7178,-74.0431)), True)
t("wrong way: Midtown -> Bronx", ride((40.7580,-73.9855),(40.8448,-73.8648)), False)
t("wrong way: Midtown -> JFK", ride((40.7580,-73.9855),(40.6413,-73.7781)), False)
t("stale default driver position (Bangalore) does not block a ride to the destination", ok(12.9716,77.5946,DEST[0],DEST[1],40.7580,-73.9855,DEST[0],DEST[1]), True)
t("stale default driver position, on-the-way ride still ok", ok(12.9716,77.5946,DEST[0],DEST[1],40.7580,-73.9855,40.7178,-74.0431), True)
t("stale default driver position, wrong-way ride still refused", ok(12.9716,77.5946,DEST[0],DEST[1],40.7580,-73.9855,40.8448,-73.8648), False)
t("ride without coordinates is not hidden", ok(*DRV,*DEST,None,None,None,None), True)
print(f"\n{sum(res)} passed, {len(res)-sum(res)} failed")
