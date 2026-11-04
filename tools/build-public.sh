#!/usr/bin/env bash
# tools/build-public.sh - build the PUBLIC, playable copy of Aurora Chess.
#
#   ./tools/build-public.sh            -> dist/public/
#
# Everything in dist/public can be downloaded by any player, so it is built
# from an ALLOWLIST: only what the game loads. tools/, README, branches and
# Git history stay in the source repo. tools/verify-public.mjs then rejects
# the build if it holds git metadata, dev files, source maps, anything shaped
# like a credential, a private IP address, or a reference to a missing file.
set -euo pipefail
cd "$(dirname "$0")/.."

out="dist/public"
rm -rf "$out"
mkdir -p "$out"

# --- allowlist: the playable game, nothing else -----------------------------
cp index.html privacy.html delete.html manifest.webmanifest service-worker.js \
   favicon.ico chess-banner.glb "$out/"
cp -r css js assets icons "$out/"
touch "$out/.nojekyll"          # serve files as-is on GitHub Pages

# Defence in depth: drop anything that should never ship even if it lands in
# an allowlisted folder later.
find "$out" \( -name '*.map' -o -name '*.md' -o -name '.DS_Store' -o -name '*.bak' \) -delete

# --- verify ------------------------------------------------------------------
# The online server address has to be public: the browser connects to it.
# The manifest's screenshots/ entries were already missing in the original.
node tools/verify-public.mjs "$out" \
  --allow-host cubic-chess.tail09d577.ts.net \
  --allow-missing screenshots/wide-1.png \
  --allow-missing screenshots/narrow-1.png

# A list of what shipped, for review and for comparing builds.
(cd "$out" && find . -type f | sort | sed 's#^\./##' | xargs sha256sum) > dist/public-manifest.sha256
echo "built $out ($(du -sh "$out" | cut -f1), $(wc -l < dist/public-manifest.sha256) files)"
