#!/usr/bin/env bash
#
# Install the ecosystem systemd units so every app comes back up on reboot.
# Run once on the server, as root (or with sudo).
#
#   sudo deploy/systemd/install.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="$ROOT/deploy/systemd"
DEST="/etc/systemd/system"

[ "$(id -u)" -eq 0 ] || { echo "run as root (sudo)"; exit 1; }

echo "ecosystem root: $ROOT"

install -m 644 "$SRC/ecosystem.target" "$DEST/ecosystem.target"
for unit in "$SRC"/ecosystem-*.service; do
  name="$(basename "$unit")"
  sed "s#__ECOSYSTEM_ROOT__#$ROOT#g" "$unit" > "$DEST/$name"
  chmod 644 "$DEST/$name"
  echo "installed $name"
done

systemctl daemon-reload
systemctl enable ecosystem.target ecosystem-grapifly ecosystem-relay ecosystem-business ecosystem-jtrade

cat <<EOF

Done. Units installed and enabled.

  Start everything:      sudo systemctl start ecosystem.target
  Stop everything:       sudo systemctl stop  ecosystem.target
  Restart one app:       sudo systemctl restart ecosystem-jtrade
  Status:                systemctl status 'ecosystem-*'

Containers also carry 'restart: unless-stopped', so Docker revives a crashed
container on its own; systemd handles host reboot / shutdown.
EOF
