#!/usr/bin/env bash
# Unattended price refresh (intended to run every 10 days): update prices, rebuild site data, commit.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run -s update-prices >> data/update-prices.log 2>&1
git add data/prices.json data/prices-last-run.json data/snkrdunk site/data data/sets.json
git commit -q -m "chore: refresh chase-card prices $(date +%F)" || echo "nothing to commit"
cat data/prices-last-run.json
