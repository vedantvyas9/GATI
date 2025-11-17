#!/bin/bash
# Quick script to check GATI authentication and metrics status

echo "========================================================================"
echo "  GATI Authentication & Metrics Status Check"
echo "========================================================================"

CONFIG_DIR="$HOME/.gati"

echo ""
echo "📂 Configuration Directory: $CONFIG_DIR"
echo "------------------------------------------------------------------------"

if [ -d "$CONFIG_DIR" ]; then
    echo "✅ Directory exists"
    echo ""
    echo "📁 Files in directory:"
    ls -lah "$CONFIG_DIR"
else
    echo "❌ Directory does not exist"
    echo "   Run 'gati auth' to create it"
    exit 1
fi

echo ""
echo "========================================================================"
echo "  🔐 Authentication Files"
echo "========================================================================"

# Check auth token
echo ""
echo "1️⃣  Auth Token ($CONFIG_DIR/.auth_token)"
echo "------------------------------------------------------------------------"
if [ -f "$CONFIG_DIR/.auth_token" ]; then
    echo "✅ File exists"
    TOKEN=$(cat "$CONFIG_DIR/.auth_token")
    echo "   Token (first 20 chars): ${TOKEN:0:20}..."
    echo "   Token length: ${#TOKEN} characters"
    echo "   File permissions: $(stat -f '%A' "$CONFIG_DIR/.auth_token" 2>/dev/null || stat -c '%a' "$CONFIG_DIR/.auth_token" 2>/dev/null)"
else
    echo "❌ File does not exist"
fi

# Check email
echo ""
echo "2️⃣  Email ($CONFIG_DIR/.auth_email)"
echo "------------------------------------------------------------------------"
if [ -f "$CONFIG_DIR/.auth_email" ]; then
    echo "✅ File exists"
    EMAIL=$(cat "$CONFIG_DIR/.auth_email")
    echo "   Email: $EMAIL"
    echo "   File permissions: $(stat -f '%A' "$CONFIG_DIR/.auth_email" 2>/dev/null || stat -c '%a' "$CONFIG_DIR/.auth_email" 2>/dev/null)"
else
    echo "❌ File does not exist"
fi

echo ""
echo "========================================================================"
echo "  📊 Telemetry Files"
echo "========================================================================"

# Check installation ID
echo ""
echo "3️⃣  Installation ID ($CONFIG_DIR/.gati_id)"
echo "------------------------------------------------------------------------"
if [ -f "$CONFIG_DIR/.gati_id" ]; then
    echo "✅ File exists"
    INSTALL_ID=$(cat "$CONFIG_DIR/.gati_id")
    echo "   Installation ID: $INSTALL_ID"
else
    echo "❌ File does not exist (will be created on first SDK use)"
fi

# Check metrics file
echo ""
echo "4️⃣  Metrics File ($CONFIG_DIR/metrics.json)"
echo "------------------------------------------------------------------------"
if [ -f "$CONFIG_DIR/metrics.json" ]; then
    echo "✅ File exists"
    echo ""
    echo "📈 Current metrics:"
    cat "$CONFIG_DIR/metrics.json" | python3 -m json.tool 2>/dev/null || cat "$CONFIG_DIR/metrics.json"
else
    echo "❌ File does not exist (will be created when SDK tracks events)"
fi

echo ""
echo "========================================================================"
echo "  🧪 Quick Tests"
echo "========================================================================"

# Test auth endpoint
echo ""
echo "5️⃣  Testing Vercel Backend Connectivity"
echo "------------------------------------------------------------------------"
echo "   Testing: https://gati-mvp-telemetry.vercel.app/api/health"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" https://gati-mvp-telemetry.vercel.app/api/health 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend is reachable (HTTP $HTTP_CODE)"
    echo "   Response: $RESPONSE_BODY"
else
    echo "❌ Backend returned HTTP $HTTP_CODE"
    echo "   Response: $RESPONSE_BODY"
fi

echo ""
echo "========================================================================"
echo "  📝 Summary"
echo "========================================================================"
echo ""

if [ -f "$CONFIG_DIR/.auth_token" ] && [ -f "$CONFIG_DIR/.auth_email" ]; then
    echo "✅ AUTHENTICATION: Configured"
    echo "   Email: $EMAIL"
    echo "   Token: ${TOKEN:0:20}..."
else
    echo "❌ AUTHENTICATION: Not configured"
    echo "   Action: Run 'gati auth' or 'python test_auth_and_metrics.py'"
fi

echo ""

if [ -f "$CONFIG_DIR/.gati_id" ]; then
    echo "✅ INSTALLATION ID: Configured"
    echo "   ID: $INSTALL_ID"
else
    echo "⚠️  INSTALLATION ID: Not yet created"
    echo "   Action: Will be created on first SDK use"
fi

echo ""

if [ -f "$CONFIG_DIR/metrics.json" ]; then
    echo "✅ METRICS: Available"
    echo "   File: $CONFIG_DIR/metrics.json"
else
    echo "⚠️  METRICS: No data yet"
    echo "   Action: Use GATI SDK to generate metrics"
fi

echo ""
echo "========================================================================"
echo "  🚀 Next Steps"
echo "========================================================================"
echo ""

if [ ! -f "$CONFIG_DIR/.auth_token" ]; then
    echo "1. Authenticate: gati auth"
    echo "   OR run: python test_auth_and_metrics.py"
    echo ""
fi

if [ -f "$CONFIG_DIR/.auth_token" ]; then
    echo "1. Test metrics sending: python test_metrics_only.py"
    echo "2. Check Vercel database for your email: $EMAIL"
    echo "3. Verify metrics in gati_metrics table"
    echo ""
fi

echo "========================================================================"
