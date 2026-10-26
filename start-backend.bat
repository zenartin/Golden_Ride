@echo off
echo Starting Golden Ride Backend...
cd driver-app\backend
start cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo.
echo Starting Internet Tunnel...
echo Your app will be permanently available at: https://golden-ride-backend-api.loca.lt
echo.
echo IMPORTANT: When opening the app for the first time, you must visit https://golden-ride-backend-api.loca.lt in your phone browser and click "Continue" to bypass the Localtunnel warning screen!
echo.
npx localtunnel --port 8000 --subdomain golden-ride-backend-api
pause
