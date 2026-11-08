# CI/CD

Pipelines run on GitHub Actions (`.github/workflows/`). No Jenkins server is needed.

| Workflow | Runs | What it does |
| --- | --- | --- |
| `backend.yml` | Every push or PR touching `driver-app/backend/` | Runs the payment-flow tests. On `main`, after approval, deploys to AWS, health-checks and rolls back on failure. |
| `mobile.yml` | Manually (Actions > Run workflow) | Builds the rider and/or driver app with Expo EAS (iOS and Android) and can upload iOS to TestFlight. |
| `build-apks.yml` | Manually | Old debug APK build, kept for reference. |

## One-time setup

1. **Server settings file** (keeps Stripe keys etc. off GitHub). From your terminal:

       bash scripts/setup_server_env.sh ~/.ssh/GoldenRideDeployKey.pem ec2-user@54.197.9.181

2. **GitHub: Settings > Environments > New environment `production`.** Add yourself under *Required reviewers* so every deploy waits for your approval.
3. **GitHub: Settings > Secrets and variables > Actions**, add (as environment secrets of `production`):
   - `EC2_HOST` = `54.197.9.181`
   - `EC2_USER` = `ec2-user`
   - `EC2_SSH_KEY` = the contents of `GoldenRideDeployKey.pem`
   - `HEALTH_URL` = `https://54-197-9-181.nip.io/openapi.json`
   - `EXPO_TOKEN` = an access token from expo.dev > Account settings > Access tokens
   - `ASC_KEY_P8` = the contents of the App Store Connect API key file (only for TestFlight upload)
4. **Mobile signing:** run `eas credentials` once per app from `user-app/` and `driver-app/` (iOS distribution certificate and profile, Android keystore). EAS then keeps them.

## Everyday use

- Merge to `main` > tests run > approve the deploy in the Actions tab > live in about two minutes.
- Mobile build: Actions > *Mobile builds (EAS)* > Run workflow > choose app, platform and whether to upload to TestFlight.
- Version numbers: bump `buildNumber` / `versionCode` in each app's `app.json` before a store build. EAS can also auto-increment them (`"autoIncrement": true` in `eas.json`).

## Before launch

Remove `ALLOW_DEMO_CARD=true` from `/opt/golden_ride/backend.env` (the test-only card that is never charged) and restart the backend.
