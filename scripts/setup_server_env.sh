#!/bin/bash
# One-time setup for the CI/CD pipeline. Run it from your own terminal.
# Copies the running backend's settings (database URL, Stripe keys, ...) into a root-only file on the
# server, so GitHub never needs to hold them. Nothing is printed. The pipeline then starts the backend
# with --env-file /opt/golden_ride/backend.env.
#
#   bash scripts/setup_server_env.sh ~/.ssh/GoldenRideDeployKey.pem ec2-user@54.197.9.181
set -euo pipefail
KEY="${1:?path to the .pem key}"; HOST="${2:?user@host}"
ssh -i "$KEY" "$HOST" 'bash -s' <<'REMOTE'
set -e
sudo mkdir -p /opt/golden_ride
sudo docker inspect golden_ride_backend --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -vE '^(PATH|LANG|GPG_KEY|HOME|HOSTNAME|PYTHON_[A-Z_]*)=' | grep -E '^[A-Z_]+=' \
  | sudo tee /opt/golden_ride/backend.env >/dev/null
sudo chmod 600 /opt/golden_ride/backend.env
sudo chown root:root /opt/golden_ride/backend.env
echo "backend.env written: $(sudo wc -l < /opt/golden_ride/backend.env) settings, root-only."
REMOTE
