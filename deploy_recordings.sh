#!/bin/sh
set -e
K=/Users/nandagopal/.ssh/GoldenRideDeployKey.pem
H=ec2-user@54.197.9.181
O="-i $K -o StrictHostKeyChecking=no"
B=/Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/driver-app/backend/app
D=/opt/golden_ride/driver-app/backend/app

scp $O $B/models/recording.py    $H:/tmp/rec_recording_model.py
scp $O $B/models/__init__.py     $H:/tmp/rec_models_init.py
scp $O $B/routers/recordings.py  $H:/tmp/rec_recordings_router.py
scp $O $B/tasks/cleanup.py       $H:/tmp/rec_cleanup_task.py
scp $O $B/main.py                $H:/tmp/rec_main.py

ssh $O $H "set -e
sudo mkdir -p $D/tasks
sudo cp /tmp/rec_recording_model.py $D/models/recording.py
sudo cp /tmp/rec_models_init.py $D/models/__init__.py
sudo cp /tmp/rec_recordings_router.py $D/routers/recordings.py
sudo cp /tmp/rec_cleanup_task.py $D/tasks/cleanup.py
sudo cp /tmp/rec_main.py $D/main.py
cd /opt/golden_ride
export STRIPE_SECRET_KEY=\$(sudo docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' golden_ride_backend | grep STRIPE_SECRET_KEY | cut -d= -f2)
[ -n \"\$STRIPE_SECRET_KEY\" ] || { echo NO_STRIPE_KEY; exit 1; }
sudo -E docker-compose build backend 2>&1 | tail -2
sudo docker stop golden_ride_backend && sudo docker rm golden_ride_backend
sudo -E docker-compose up -d --no-deps backend 2>&1 | tail -2
sleep 15
sudo docker logs --tail 3 golden_ride_backend 2>&1
"
