#!/bin/bash
set -e

ROOT_DIR="/Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride"
KEYCHAIN_PATH="$HOME/Library/Keychains/ios_build.keychain-db"
KEYCHAIN_PASS="goldenride2026"

echo "=== Setting up build keychain ==="
security delete-keychain "$KEYCHAIN_PATH" 2>/dev/null || true
security create-keychain -p "$KEYCHAIN_PASS" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASS" "$KEYCHAIN_PATH"

echo "=== Importing Apple WWDR Intermediate Certificates ==="
for c in "$ROOT_DIR"/AppleWWDRCAG*.cer; do
    if [ -f "$c" ]; then
        security import "$c" -k "$KEYCHAIN_PATH" -T /usr/bin/codesign -T /usr/bin/security
    fi
done

echo "=== Importing Distribution Identity ==="
security import "$ROOT_DIR/distribution.p12" \
    -k "$KEYCHAIN_PATH" \
    -P "123456" \
    -T /usr/bin/codesign \
    -T /usr/bin/security \
    -A

echo "=== Authorizing codesign without GUI prompt ==="
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASS" "$KEYCHAIN_PATH"

echo "=== Setting Keychains in Search List ==="
# Get existing keychains
CURRENT_KEYCHAINS=$(security list-keychains -d user | tr -d '"' | tr '\n' ' ')
security list-keychains -d user -s "$KEYCHAIN_PATH" $CURRENT_KEYCHAINS

echo "=== Testing Code Signing on a dummy file ==="
echo "test" > /tmp/test_sign_dummy
codesign --force --keychain "$KEYCHAIN_PATH" --sign "Apple Distribution: Nanda Gopal D R (5X8DU7KFPK)" /tmp/test_sign_dummy
echo "=== Success! Test codesign verified without prompt! ==="
rm -f /tmp/test_sign_dummy
