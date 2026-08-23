#!/bin/sh
# Chromium flags with '=' cannot sit in snapcraft apps.*.command.
# --no-sandbox is required inside the snap sandbox.
export TMPDIR="${XDG_RUNTIME_DIR:-/tmp}"
exec "$SNAP/opt/Paint/paint-electron" --no-sandbox --disable-logging --log-level=3 "$@"
