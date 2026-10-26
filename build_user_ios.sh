#!/bin/bash
set -e

ROOT_DIR="/Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride"
KEY_ID="NV742T4CVU"
KEY_ISSUER="cb62a969-b3c7-4722-ba8b-bda7e3118a01"
KEY_PATH="$ROOT_DIR/AuthKey_$KEY_ID.p8"
export PATH="$ROOT_DIR/node-v22.12.0-darwin-x64/bin:$PATH"

# Setup private keys directory for altool
mkdir -p "$HOME/.appstoreconnect/private_keys"
mkdir -p "$HOME/.private_keys"
cp -f "$KEY_PATH" "$HOME/.appstoreconnect/private_keys/AuthKey_$KEY_ID.p8" 2>/dev/null || true
cp -f "$KEY_PATH" "$HOME/.private_keys/AuthKey_$KEY_ID.p8" 2>/dev/null || true

# Setup build keychain
KEYCHAIN_PATH="$HOME/Library/Keychains/ios_build.keychain-db"
security unlock-keychain -p "goldenride2026" "$KEYCHAIN_PATH" 2>/dev/null || true

mkdir -p "$ROOT_DIR/builds"

echo "=== 1. Archiving User App (iOS) ==="
xcodebuild -workspace "$ROOT_DIR/user-app/ios/GoldenRide.xcworkspace" \
  -scheme GoldenRide \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ROOT_DIR/builds/GoldenRide_User.xcarchive" \
  DEVELOPMENT_TEAM="5X8DU7KFPK" \
  CODE_SIGN_STYLE="Manual" \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="Golden Ride User AppStore 2026" \
  OTHER_CODE_SIGN_FLAGS="--keychain $KEYCHAIN_PATH" \
  archive

echo "=== 2. Exporting User App IPA ==="
rm -rf "$ROOT_DIR/builds/user-export"
xcodebuild -exportArchive \
  -archivePath "$ROOT_DIR/builds/GoldenRide_User.xcarchive" \
  -exportPath "$ROOT_DIR/builds/user-export" \
  -exportOptionsPlist "$ROOT_DIR/ExportOptions_user.plist"

IPA_FILE=$(find "$ROOT_DIR/builds/user-export" -name "*.ipa" | head -1)
if [ -z "$IPA_FILE" ]; then
  echo "ERROR: Failed to find exported IPA!"
  exit 1
fi

cp -f "$IPA_FILE" "$ROOT_DIR/Golden_Ride_User.ipa"
echo "=== 3. Exported IPA to $ROOT_DIR/Golden_Ride_User.ipa ==="
ls -lh "$ROOT_DIR/Golden_Ride_User.ipa"

echo "=== 4. Uploading User App IPA to TestFlight / App Store Connect ==="
xcrun altool --upload-app -f "$ROOT_DIR/Golden_Ride_User.ipa" -t ios --apiKey "$KEY_ID" --apiIssuer "$KEY_ISSUER"
echo "=== User App IPA Upload Finished Successfully! ==="
