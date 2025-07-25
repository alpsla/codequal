#!/bin/bash
# Setup script for DeepWiki monitoring alerts

set -e

echo "🚨 Setting up DeepWiki Monitoring Alerts..."

# Check for required environment variables
required_vars=("DO_API_TOKEN" "SLACK_WEBHOOK_URL" "ENVIRONMENT")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        exit 1
    fi
done

# Function to create alert via DigitalOcean API
create_alert() {
    local name=$1
    local description=$2
    local metric=$3
    local comparison=$4
    local value=$5
    local window=$6
    local channels=$7

    echo "Creating alert: $name..."
    
    curl -s -X POST \
        https://api.digitalocean.com/v2/monitoring/alerts \
        -H "Authorization: Bearer $DO_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"alerts\": [{
                \"enabled\": true,
                \"type\": \"v1/insights/droplet/custom_metric\",
                \"name\": \"$name\",
                \"description\": \"$description\",
                \"compare\": \"$comparison\",
                \"value\": $value,
                \"window\": \"$window\",
                \"entities\": [\"$CLUSTER_ID\"],
                \"tags\": [\"deepwiki\", \"$ENVIRONMENT\"],
                \"slack\": [{
                    \"channel\": \"platform-alerts\",
                    \"url\": \"$SLACK_WEBHOOK_URL\"
                }],
                \"email\": [\"platform@codequal.dev\"]
            }]
        }" > /dev/null

    echo "✅ Alert '$name' created"
}

# Create storage usage alerts
create_alert \
    "DeepWiki Storage Warning" \
    "DeepWiki temp storage above 80%" \
    "deepwiki_storage_usage_percent" \
    "GreaterThan" \
    80 \
    "5m" \
    "slack,email"

create_alert \
    "DeepWiki Storage Critical" \
    "DeepWiki temp storage above 90% - CRITICAL" \
    "deepwiki_storage_usage_percent" \
    "GreaterThan" \
    90 \
    "2m" \
    "slack,email,pagerduty"

create_alert \
    "DeepWiki No Capacity" \
    "DeepWiki has less than 2GB available" \
    "deepwiki_temp_available_gb" \
    "LessThan" \
    2 \
    "1m" \
    "slack,email,pagerduty"

# Create analysis duration alert
create_alert \
    "DeepWiki Long Running Analysis" \
    "Analysis running for more than 30 minutes" \
    "deepwiki_analysis_duration_minutes" \
    "GreaterThan" \
    30 \
    "5m" \
    "slack"

# Create cleanup failure alert
create_alert \
    "DeepWiki Cleanup Failures" \
    "High rate of cleanup failures" \
    "deepwiki_cleanup_failure_rate" \
    "GreaterThan" \
    0.1 \
    "10m" \
    "slack,email"

echo ""
echo "🎉 All alerts created successfully!"
echo ""
echo "📊 Dashboard URL: https://cloud.digitalocean.com/monitoring/alerts"
echo ""
echo "📱 Next steps:"
echo "1. Download DigitalOcean mobile app for push notifications"
echo "2. Test alerts with: ./test-alerts.sh"
echo "3. View dashboard at the URL above"