#!/bin/bash

# Setup Grafana Integration for CodeQual Security Monitoring
# This script configures Grafana dashboards, alerts, and Prometheus integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Setting up Grafana Integration for Security Monitoring${NC}"

# Load environment variables from .env file
if [ -f ".env" ]; then
    echo -e "${BLUE}📁 Loading environment variables from .env file...${NC}"
    set -a
    source .env
    set +a
else
    echo -e "${YELLOW}⚠️  No .env file found, checking for existing environment variables...${NC}"
fi

# Check required environment variables
REQUIRED_VARS=("GRAFANA_URL" "GRAFANA_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: $var must be set${NC}"
        echo ""
        echo "Please add these to your .env file:"
        echo "GRAFANA_URL=https://your-grafana.com"
        echo "GRAFANA_API_KEY=your-api-key"
        echo "SLACK_WEBHOOK_URL=your-slack-webhook (optional)"
        echo "ALERT_EMAIL_RECIPIENTS=security@company.com (optional)"
        echo "PROMETHEUS_URL=http://localhost:9090 (optional)"
        exit 1
    fi
done

echo -e "${BLUE}🔧 Configuration:${NC}"
echo "Grafana URL: $GRAFANA_URL"
echo "API Key: ${GRAFANA_API_KEY:0:10}..."

# Create Grafana dashboard for security monitoring
echo -e "${BLUE}📋 Creating Security Monitoring Dashboard...${NC}"

# Dashboard JSON configuration
cat > /tmp/security-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "CodeQual Security Monitoring",
    "description": "Comprehensive security monitoring for CodeQual authentication system",
    "tags": ["codequal", "security", "authentication"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Authentication Events",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(codequal_auth_events_total[5m])",
            "legendFormat": "Auth Rate (events/sec)"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "displayMode": "list",
              "orientation": "horizontal"
            },
            "mappings": [],
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 10},
                {"color": "red", "value": 50}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Failed Authentication Attempts",
        "type": "timeseries",
        "targets": [
          {
            "expr": "codequal_auth_events_total{result=\"failure\"}",
            "legendFormat": "Failed Attempts"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {"mode": "palette-classic"},
            "custom": {
              "drawStyle": "line",
              "lineInterpolation": "linear",
              "barAlignment": 0,
              "lineWidth": 1,
              "fillOpacity": 10,
              "gradientMode": "none",
              "spanNulls": false,
              "insertNulls": false,
              "showPoints": "never",
              "pointSize": 5,
              "stacking": {"mode": "none", "group": "A"},
              "axisPlacement": "auto",
              "axisLabel": "",
              "scaleDistribution": {"type": "linear"},
              "hideFrom": {"legend": false, "tooltip": false, "vis": false},
              "thresholdsStyle": {"mode": "off"}
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "green", "value": null},
                {"color": "red", "value": 10}
              ]
            },
            "unit": "short"
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Security Threats by Type",
        "type": "piechart",
        "targets": [
          {
            "expr": "codequal_security_threats_total",
            "legendFormat": "{{type}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {"mode": "palette-classic"},
            "custom": {
              "hideFrom": {"tooltip": false, "vis": false, "legend": false}
            },
            "mappings": []
          }
        },
        "gridPos": {"h": 8, "w": 8, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Rate Limiting Events",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(codequal_rate_limit_events_total[1m])",
            "legendFormat": "{{result}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {"mode": "palette-classic"},
            "custom": {
              "drawStyle": "line",
              "lineInterpolation": "linear",
              "lineWidth": 1,
              "fillOpacity": 10,
              "spanNulls": false,
              "showPoints": "never",
              "stacking": {"mode": "none", "group": "A"},
              "axisPlacement": "auto"
            },
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 5},
                {"color": "red", "value": 20}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 8, "x": 8, "y": 8}
      },
      {
        "id": 5,
        "title": "Top IP Addresses by Failed Attempts",
        "type": "table",
        "targets": [
          {
            "expr": "topk(10, sum by (ip_address) (codequal_auth_events_total{result=\"failure\"}))",
            "format": "table",
            "instant": true
          }
        ],
        "fieldConfig": {
          "defaults": {
            "custom": {
              "align": "auto",
              "displayMode": "auto"
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 5},
                {"color": "red", "value": 10}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 8, "x": 16, "y": 8}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "timepicker": {},
    "timezone": "",
    "refresh": "30s",
    "schemaVersion": 27,
    "version": 0,
    "links": []
  },
  "overwrite": false
}
EOF

# Create the dashboard
echo -e "${BLUE}📊 Creating Grafana dashboard...${NC}"

if curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
     -H "Content-Type: application/json" \
     -X POST \
     "$GRAFANA_URL/api/dashboards/db" \
     -d @/tmp/security-dashboard.json | grep -q '"status":"success"'; then
    echo -e "${GREEN}✅ Security dashboard created successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Dashboard may already exist or there was an issue${NC}"
fi

# Create alert rules
echo -e "${BLUE}🚨 Setting up alert rules...${NC}"

# Alert rule for high authentication failure rate
cat > /tmp/auth-failure-alert.json << 'EOF'
{
  "alert": {
    "id": null,
    "version": 0,
    "uid": "",
    "title": "High Authentication Failure Rate",
    "condition": "B",
    "data": [
      {
        "refId": "A",
        "queryType": "",
        "relativeTimeRange": {
          "from": 600,
          "to": 0
        },
        "model": {
          "expr": "rate(codequal_auth_events_total{result=\"failure\"}[5m])",
          "interval": "",
          "refId": "A"
        }
      },
      {
        "refId": "B",
        "queryType": "",
        "relativeTimeRange": {
          "from": 0,
          "to": 0
        },
        "model": {
          "conditions": [
            {
              "evaluator": {
                "params": [0.1],
                "type": "gt"
              },
              "operator": {
                "type": "and"
              },
              "query": {
                "params": ["A"]
              },
              "reducer": {
                "params": [],
                "type": "last"
              },
              "type": "query"
            }
          ],
          "datasource": {
            "type": "__expr__",
            "uid": "__expr__"
          },
          "expression": "A",
          "hide": false,
          "intervalMs": 1000,
          "maxDataPoints": 43200,
          "reducer": "last",
          "refId": "B",
          "type": "reduce"
        }
      }
    ],
    "intervalSeconds": 60,
    "noDataState": "NoData",
    "execErrState": "Alerting",
    "for": "5m",
    "annotations": {
      "description": "Authentication failure rate is abnormally high",
      "runbook_url": "",
      "summary": "High authentication failure rate detected"
    },
    "labels": {
      "severity": "warning",
      "team": "security"
    }
  }
}
EOF

# Alert rule for critical security events
cat > /tmp/critical-security-alert.json << 'EOF'
{
  "alert": {
    "id": null,
    "version": 0,
    "uid": "",
    "title": "Critical Security Event",
    "condition": "B",
    "data": [
      {
        "refId": "A",
        "queryType": "",
        "relativeTimeRange": {
          "from": 300,
          "to": 0
        },
        "model": {
          "expr": "codequal_security_threats_total{type=\"session_hijack\"} OR codequal_security_threats_total{type=\"brute_force\"}",
          "interval": "",
          "refId": "A"
        }
      },
      {
        "refId": "B",
        "queryType": "",
        "relativeTimeRange": {
          "from": 0,
          "to": 0
        },
        "model": {
          "conditions": [
            {
              "evaluator": {
                "params": [0],
                "type": "gt"
              },
              "operator": {
                "type": "and"
              },
              "query": {
                "params": ["A"]
              },
              "reducer": {
                "params": [],
                "type": "last"
              },
              "type": "query"
            }
          ],
          "datasource": {
            "type": "__expr__",
            "uid": "__expr__"
          },
          "expression": "A",
          "hide": false,
          "intervalMs": 1000,
          "maxDataPoints": 43200,
          "reducer": "last",
          "refId": "B",
          "type": "reduce"
        }
      }
    ],
    "intervalSeconds": 30,
    "noDataState": "NoData",
    "execErrState": "Alerting",
    "for": "0m",
    "annotations": {
      "description": "Critical security threat detected: {{ $labels.type }}",
      "runbook_url": "",
      "summary": "CRITICAL: Security threat detected"
    },
    "labels": {
      "severity": "critical",
      "team": "security"
    }
  }
}
EOF

# Create notification policies
echo -e "${BLUE}📬 Setting up notification channels...${NC}"

# Slack notification channel
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    cat > /tmp/slack-notification.json << EOF
{
  "name": "slack-security-alerts",
  "type": "slack",
  "settings": {
    "url": "$SLACK_WEBHOOK_URL",
    "channel": "#security-alerts",
    "username": "Grafana",
    "title": "CodeQual Security Alert",
    "text": "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}"
  }
}
EOF

    if curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
         -H "Content-Type: application/json" \
         -X POST \
         "$GRAFANA_URL/api/alert-notifications" \
         -d @/tmp/slack-notification.json | grep -q '"id"'; then
        echo -e "${GREEN}✅ Slack notification channel created${NC}"
    else
        echo -e "${YELLOW}⚠️  Slack notification setup skipped or failed${NC}"
    fi
fi

# Email notification channel
if [ ! -z "$ALERT_EMAIL_RECIPIENTS" ]; then
    cat > /tmp/email-notification.json << EOF
{
  "name": "email-security-alerts",
  "type": "email",
  "settings": {
    "addresses": "$ALERT_EMAIL_RECIPIENTS",
    "subject": "CodeQual Security Alert",
    "body": "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}"
  }
}
EOF

    if curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
         -H "Content-Type: application/json" \
         -X POST \
         "$GRAFANA_URL/api/alert-notifications" \
         -d @/tmp/email-notification.json | grep -q '"id"'; then
        echo -e "${GREEN}✅ Email notification channel created${NC}"
    else
        echo -e "${YELLOW}⚠️  Email notification setup skipped or failed${NC}"
    fi
fi

# Create Prometheus data source if it doesn't exist
echo -e "${BLUE}📊 Setting up Prometheus data source...${NC}"

cat > /tmp/prometheus-datasource.json << EOF
{
  "name": "CodeQual-Prometheus",
  "type": "prometheus",
  "url": "${PROMETHEUS_URL:-http://localhost:9090}",
  "access": "proxy",
  "basicAuth": false,
  "isDefault": true
}
EOF

if curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
     -H "Content-Type: application/json" \
     -X POST \
     "$GRAFANA_URL/api/datasources" \
     -d @/tmp/prometheus-datasource.json | grep -q '"id"'; then
    echo -e "${GREEN}✅ Prometheus data source created${NC}"
else
    echo -e "${YELLOW}⚠️  Prometheus data source may already exist${NC}"
fi

# Set up folder structure
echo -e "${BLUE}📁 Creating dashboard folders...${NC}"

cat > /tmp/security-folder.json << 'EOF'
{
  "title": "Security Monitoring",
  "uid": "security-monitoring"
}
EOF

curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
     -H "Content-Type: application/json" \
     -X POST \
     "$GRAFANA_URL/api/folders" \
     -d @/tmp/security-folder.json > /dev/null

# Create monitoring configuration file
echo -e "${BLUE}⚙️  Creating monitoring configuration...${NC}"

cat > monitoring-config.yaml << 'EOF'
# CodeQual Security Monitoring Configuration

# Grafana Configuration
grafana:
  url: ${GRAFANA_URL}
  api_key: ${GRAFANA_API_KEY}
  
  dashboards:
    - name: "Security Monitoring"
      uid: "codequal-security"
      path: "/tmp/security-dashboard.json"
    
  alerts:
    - name: "High Auth Failure Rate"
      threshold: 0.1
      duration: "5m"
      severity: "warning"
    
    - name: "Critical Security Event"
      threshold: 0
      duration: "0m"
      severity: "critical"

# Prometheus Configuration  
prometheus:
  url: ${PROMETHEUS_URL:-http://localhost:9090}
  scrape_interval: "15s"
  
  targets:
    - job_name: "codequal-auth"
      static_configs:
        - targets: ["localhost:9090"]

# Alert Channels
notifications:
  slack:
    enabled: ${SLACK_WEBHOOK_URL:+true}
    webhook_url: "${SLACK_WEBHOOK_URL}"
    channel: "#security-alerts"
    
  email:
    enabled: ${ALERT_EMAIL_RECIPIENTS:+true}
    recipients: "${ALERT_EMAIL_RECIPIENTS}"
    
  webhook:
    enabled: ${WEBHOOK_ALERT_URL:+true}
    url: "${WEBHOOK_ALERT_URL}"
    headers:
      Authorization: "Bearer ${WEBHOOK_ALERT_TOKEN}"

# Critical Security Events (immediate alerts)
critical_events:
  - "PERMISSION_ESCALATION"
  - "SESSION_HIJACK_DETECTED"
  - "BRUTE_FORCE_ATTACK"
  - "SUSPICIOUS_ACTIVITY"

# Alert Thresholds
thresholds:
  failed_auth_per_minute: 10
  access_denied_per_hour: 50
  rate_limit_hits_per_hour: 100
  high_risk_score: 80
  critical_risk_score: 95

# Monitoring Intervals
intervals:
  metrics_collection: "30s"
  alert_evaluation: "1m"
  dashboard_refresh: "30s"
  log_retention_days: 90
EOF

echo -e "${GREEN}✅ Monitoring configuration created: monitoring-config.yaml${NC}"

# Clean up temporary files
rm -f /tmp/*.json

echo -e "${GREEN}🎉 Grafana integration setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Setup Summary:${NC}"
echo "✅ Security monitoring dashboard created"
echo "✅ Alert rules configured for critical events"
echo "✅ Notification channels set up (if configured)"
echo "✅ Prometheus data source configured"
echo "✅ Monitoring configuration file created"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Start your Prometheus server to collect metrics"
echo "2. Configure your application to export metrics on port 9090"
echo "3. Test alerts by triggering security events"
echo "4. Customize dashboard panels as needed"
echo ""
echo -e "${BLUE}🔗 Access your dashboard:${NC}"
echo "$GRAFANA_URL/d/codequal-security/codequal-security-monitoring"