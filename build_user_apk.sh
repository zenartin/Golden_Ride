#!/bin/bash
set -e

ROOT_DIR="/Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride"
USER_ANDROID="$ROOT_DIR/user-app/android"

export JAVA_HOME="$ROOT_DIR/tools/jdk-17.0.20.1+1/Contents/Home"
export ANDROID_HOME="$ROOT_DIR/tools/android-sdk"
export ANDROID_SDK_ROOT="$ROOT_DIR/tools/android-sdk"
export PATH="$ROOT_DIR/node-v22.12.0-darwin-x64/bin:$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
export GRADLE_OPTS="-Xmx4096m -XX:MaxMetaspaceSize=1024m"

echo "=== Building User App Release APK ==="
cd "$USER_ANDROID"
./gradlew assembleRelease --no-daemon

APK_SRC="$USER_ANDROID/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK_SRC" ]; then
    echo "ERROR: Release APK not found at $APK_SRC"
    exit 1
fi

APK_DEST="$ROOT_DIR/Golden_Ride_User.apk"
cp -f "$APK_SRC" "$APK_DEST"
echo "=== Success! Copied APK to $APK_DEST ==="
ls -lh "$APK_DEST"
