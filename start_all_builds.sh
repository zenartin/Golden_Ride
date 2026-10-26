#!/bin/bash
export PATH="/Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/node-v22.12.0-darwin-x64/bin:$PATH"
export EXPO_APPLE_TEAM_ID="5X8DU7KFPK"
export CI=1

echo "--- Starting builds for user-app ---"
cd /Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/user-app
npx eas-cli@latest build --platform android --profile preview --no-wait --non-interactive
npx eas-cli@latest build --platform ios --profile production --auto-submit --no-wait --non-interactive

echo "--- Starting builds for driver-app ---"
cd /Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/driver-app
npx eas-cli@latest build --platform android --profile preview --no-wait --non-interactive
npx eas-cli@latest build --platform ios --profile production --auto-submit --no-wait --non-interactive

echo "All builds successfully dispatched to EAS!"
