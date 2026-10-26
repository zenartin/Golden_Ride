#!/bin/bash
export PATH="/Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/node-v22.12.0-darwin-x64/bin:$PATH"
export EXPO_TOKEN="jlDF1iMBWWwKSjan0660p7SecrPA_zHpPZXZA9I2"
export CI=1

ROOT_DIR="/Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride"

echo "Starting Android build for driver-app..."
cd "$ROOT_DIR/driver-app"
npx eas-cli@latest build --platform android --profile preview --non-interactive

echo "Starting iOS build & submit for user-app..."
cd "$ROOT_DIR"
./expect_build_ios.tcl "$ROOT_DIR/user-app"

echo "Starting iOS build & submit for driver-app..."
cd "$ROOT_DIR"
./expect_build_ios.tcl "$ROOT_DIR/driver-app"

echo "All remaining builds initiated."
