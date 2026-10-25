#!/usr/bin/env bash
# Unattended price refresh (intended to run every 10 days): update prices, rebuild site data, commit, push (GitHub Actions redeploys Pages).
set -euo pipefail
cd "$(dirname "$0")/.."
# 1) refresh the community/market ranking (Pokeca-Now flea-market medians) and re-rank each set's community-picked Top 10
node scripts/fetch-community.js >> data/update-prices.log 2>&1 || true
node scripts/research-chase.js --pick >> data/update-prices.log 2>&1 || true
node scripts/build-data.cjs >> data/update-prices.log 2>&1
# 2) raw + PSA 10 prices and TCGplayer/SNKRDUNK links for those cards
npm run -s update-prices >> data/update-prices.log 2>&1
node scripts/fetch-box-images.js >> data/update-prices.log 2>&1 || true   # box photos for any newly kept set
npm run -s build >> data/update-prices.log 2>&1
git add data/prices.json data/prices-last-run.json data/snkrdunk data/tcgplayer data/community content/chase-picks.json content/box-images.json site/data data/sets.json
git commit -q -m "chore: refresh chase-card prices $(date +%F)" || echo "nothing to commit"
git push -q origin main && echo "pushed to GitHub Pages"
cat data/prices-last-run.json
