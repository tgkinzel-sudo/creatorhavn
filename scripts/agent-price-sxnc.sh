#!/usr/bin/env bash
set -euo pipefail

# === Konfiguration ===
API_BASE="https://creatorhavn.vercel.app"
ADMIN_KEY="${ADMIN_API_KEY:?ADMIN_API_KEY env var required}"

# Wähle EINE der Varianten:
# A) Vorhandenen LIVE-Preis fix setzen (empfohlen, wenn du bereits price_... live hast)
PRICE_ID_FIXED="${NEXT_PUBLIC_STRIPE_PRICE_ID:-}"

# B) Oder Preis per LookupKey automatisch anlegen/aktualisieren (falls noch keiner existiert)
LOOKUP_KEY="${STRIPE_LOOKUP_KEY:-creatorhavn_pro_monthly_live}"
AMOUNT="${STRIPE_AMOUNT_CENTS:-1900}"          # in Cent, z.B. 1900 = 19,00 €
CURRENCY="${STRIPE_CURRENCY:-eur}"
INTERVAL="${STRIPE_INTERVAL:-month}"
PRODUCT_NAME="${STRIPE_PRODUCT_NAME:-Creatorhavn Pro (Live)}"

# === 1) Healthcheck (optional) ===
curl -fsSL "${API_BASE}/api/ping" >/dev/null || {
  echo "❌ API /api/ping nicht erreichbar"
  exit 1
}
echo "✅ API erreichbar"

# === 2) Preis sicherstellen ===
PRICE_ID=""
if [ -n "${PRICE_ID_FIXED}" ]; then
  PRICE_ID="${PRICE_ID_FIXED}"
  echo "ℹ️  Verwende vorhandene LIVE Price-ID: ${PRICE_ID}"
else
  echo "➡️  Erzeuge/prüfe Stripe-Preis per LookupKey: ${LOOKUP_KEY}"
  CREATE_PAYLOAD=$(jq -n \
    --arg lk "$LOOKUP_KEY" \
    --argjson amount "$AMOUNT" \
    --arg currency "$CURRENCY" \
    --arg interval "$INTERVAL" \
    --arg name "$PRODUCT_NAME" \
    '{ lookupKey: $lk, amount: $amount, currency: $currency, interval: $interval, productName: $name }')

  RES=$(curl -fsS -X POST "${API_BASE}/api/admin/stripe/prices" \
      -H "x-admin-key: ${ADMIN_KEY}" \
      -H "content-type: application/json" \
      -d "${CREATE_PAYLOAD}")

  # Erwartet: { "priceId": "price_xxx" }
  PRICE_ID=$(echo "$RES" | jq -r '.priceId // empty')
  if [ -z "$PRICE_ID" ]; then
    echo "❌ Konnte priceId aus Antwort nicht lesen:"
    echo "$RES"
    exit 1
  fi
  echo "✅ Preis gesichert: ${PRICE_ID}"
fi

# === 3) ENV in Vercel setzen ===
ENV_PAYLOAD=$(jq -n \
  --arg key "NEXT_PUBLIC_STRIPE_PRICE_ID" \
  --arg val "$PRICE_ID" \
  '{ set: [ { key: $key, value: $val, target: ["production"] } ] }')

curl -fsS -X POST "${API_BASE}/api/admin/config/env" \
  -H "x-admin-key: ${ADMIN_KEY}" \
  -H "content-type: application/json" \
  -d "${ENV_PAYLOAD}" >/dev/null
echo "✅ NEXT_PUBLIC_STRIPE_PRICE_ID auf ${PRICE_ID} gesetzt (Production)"

# === 4) Redeploy triggern ===
curl -fsS -X POST "${API_BASE}/api/admin/deploy" \
  -H "x-admin-key: ${ADMIN_KEY}" >/dev/null
echo "✅ Redeploy getriggert"

echo "🎉 Agent-Run abgeschlossen."
