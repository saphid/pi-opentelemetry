#!/usr/bin/env bash
set -euo pipefail

GRAFANA_URL="${GRAFANA_URL:-http://127.0.0.1:3000}"
GRAFANA_USER="${GRAFANA_USER:-admin}"
DASHBOARD_DIR="${DASHBOARD_DIR:-$HOME/pi-otel-dashboards}"

if [[ -z "${GRAFANA_PASSWORD:-}" ]]; then
  read -rsp "Grafana password for ${GRAFANA_USER}: " GRAFANA_PASSWORD
  echo
fi

for file in "$DASHBOARD_DIR"/*.json; do
  name=$(basename "$file")
  echo "Importing $name"
  jq -n --argjson dashboard "$(cat "$file")" '{dashboard: $dashboard, overwrite: true, folderId: 0}' \
    | curl -fsS -u "$GRAFANA_USER:$GRAFANA_PASSWORD" \
      -H 'Content-Type: application/json' \
      -X POST "$GRAFANA_URL/api/dashboards/db" \
      --data-binary @- >/tmp/grafana-import-response.json
  cat /tmp/grafana-import-response.json
  echo
 done
