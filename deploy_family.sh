#!/bin/sh
set -e
K=/Users/nandagopal/.ssh/GoldenRideDeployKey.pem
H=ec2-user@54.197.9.181
O="-i $K -o StrictHostKeyChecking=no"
B=/Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/driver-app/backend/app
D=/opt/golden_ride/driver-app/backend/app

scp $O $B/routers/user.py   $H:/tmp/fd3_user_router.py
scp $O $B/schemas/auth.py   $H:/tmp/fd3_auth_schema.py
scp $O $B/models/user.py    $H:/tmp/fd3_user_model.py

ssh $O $H "set -e
sudo docker exec golden_ride_postgres psql -U postgres golden_ride -c 'ALTER TABLE users ADD COLUMN IF NOT EXISTS home_address VARCHAR' -c 'ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR'
sudo cp /tmp/fd3_user_router.py $D/routers/user.py
sudo cp /tmp/fd3_auth_schema.py $D/schemas/auth.py
sudo cp /tmp/fd3_user_model.py $D/models/user.py
cd /opt/golden_ride
export STRIPE_SECRET_KEY=\$(sudo docker exec golden_ride_backend printenv STRIPE_SECRET_KEY)
[ -n \"\$STRIPE_SECRET_KEY\" ] || { echo NO_STRIPE_KEY; exit 1; }
sudo -E docker-compose build backend 2>&1 | tail -2
sudo docker stop golden_ride_backend && sudo docker rm golden_ride_backend
sudo -E docker-compose up -d --no-deps backend 2>&1 | tail -2
sleep 15
sudo docker logs --tail 3 golden_ride_backend 2>&1
curl -s -w ' login->%{http_code}\n' -X POST http://localhost:8001/api/user/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"x@x.com\",\"password\":\"x\"}'
"
