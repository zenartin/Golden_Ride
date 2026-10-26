#!/bin/bash
export PATH="/Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/node-v22.12.0-darwin-x64/bin:$PATH"
export EXPO_TOKEN="jlDF1iMBWWwKSjan0660p7SecrPA_zHpPZXZA9I2"

echo "Starting builds for user-app..."
cd /Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/user-app
npx eas-cli@latest build --platform android --profile preview --non-interactive
npx eas-cli@latest build --platform ios --profile production --auto-submit --non-interactive

echo "Starting builds for driver-app..."
cd /Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/driver-app
npx eas-cli@latest build --platform android --profile preview --non-interactive
npx eas-cli@latest build --platform ios --profile production --auto-submit --non-interactive

echo "Builds initiated!"
