#!/usr/bin/env bash
# Sets VERSION in pwas/service-worker.js to <date>-<hash of shared files>.
# Run from anywhere before pushing:  scripts/bump-sw.sh  (add --commit to also commit).
# Unchanged shared files => same hash => no needless cache churn for players.
set -euo pipefail
cd "$(dirname "$0")/.."
SW=pwas/service-worker.js
# Every same-folder shared file under pwas/ except per-game folders that own an sw.js.
mapfile -t FILES < <(cd pwas && find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.json' -o -name '*.webmanifest' -o -name '*.svg' -o -name '*.woff2' -o -name '*.txt' \) \
  | while read -r f; do d=${f#./}; top=${d%%/*}; [[ "$d" != */* || ! -f "$top/sw.js" ]] && [[ "$d" != service-worker.js ]] && echo "$d"; done | sort)
HASH=$(cd pwas && cat "${FILES[@]}" | sha256sum | cut -c1-10)
NEW="$(date +%Y%m%d)-$HASH"
OLD=$(sed -n "s/^const VERSION = '\(.*\)';/\1/p" "$SW")
if [[ "${OLD#*-}" == "$HASH" ]]; then echo "service-worker.js already at $OLD (shared files unchanged)"; exit 0; fi
sed -i "s/^const VERSION = '.*';/const VERSION = '$NEW';/" "$SW"
echo "service-worker.js VERSION: $OLD -> $NEW (${#FILES[@]} files hashed)"
if [[ "${1:-}" == "--commit" ]]; then git add --sparse "$SW" && git commit -qm "Bump shared SW cache to $NEW" && echo committed; fi
