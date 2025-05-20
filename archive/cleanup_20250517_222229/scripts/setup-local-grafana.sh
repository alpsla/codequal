#!/bin/bash

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Change to the project root directory
cd "$PROJECT_ROOT"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed or not in the PATH."
  echo "Please install Docker to continue."
  exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
  echo "Error: Docker Compose is not installed or not in the PATH."
  echo "Please install Docker Compose to continue."
  exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found in the project root."
  echo "Please create an .env file with SUPABASE_URL and SUPABASE_KEY."
  exit 1
fi

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file."
  exit 1
fi

# Extract project ID from SUPABASE_URL
PROJECT_ID=$(echo $SUPABASE_URL | awk -F[/:] '{print $4}')
if [ -z "$PROJECT_ID" ]; then
  echo "Error: Could not extract project ID from SUPABASE_URL."
  exit 1
fi

# Check if Grafana directory exists, create if not
GRAFANA_DIR="$PROJECT_ROOT/local/grafana"
if [ ! -d "$GRAFANA_DIR" ]; then
  echo "Creating Grafana configuration directory..."
  mkdir -p "$GRAFANA_DIR/provisioning/datasources"
  mkdir -p "$GRAFANA_DIR/provisioning/dashboards"
  mkdir -p "$GRAFANA_DIR/dashboards"
fi

# Create datasource configuration
cat > "$GRAFANA_DIR/provisioning/datasources/supabase.yaml" << EOF
apiVersion: 1

datasources:
  - name: Supabase PostgreSQL
    type: postgres
    url: db.$PROJECT_ID.supabase.co:5432
    user: postgres
    secureJsonData:
      password: "${SUPABASE_KEY}"
    jsonData:
      database: postgres
      sslmode: "require"
      maxOpenConns: 10
      maxIdleConns: 2
      connMaxLifetime: 14400
      postgresVersion: 1200
      timescaledb: false
EOF

# Create sample dashboard configuration
cat > "$GRAFANA_DIR/provisioning/dashboards/local.yaml" << EOF
apiVersion: 1

providers:
  - name: 'CodeQual'
    orgId: 1
    folder: 'CodeQual'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
EOF

# Create a simple Docker Compose file for local Grafana
cat > "$PROJECT_ROOT/docker-compose.grafana.yml" << EOF
version: '3'
services:
  grafana:
    image: grafana/grafana:latest
    container_name: codequal-grafana
    ports:
      - "3000:3000"
    volumes:
      - ./local/grafana/provisioning:/etc/grafana/provisioning
      - ./local/grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
EOF

# Create a sample dashboard
cat > "$GRAFANA_DIR/dashboards/pr-analysis.json" << EOF
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": {
          "type": "grafana",
          "uid": "-- Grafana --"
        },
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "target": {
          "limit": 100,
          "matchAny": false,
          "tags": [],
          "type": "dashboard"
        },
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "liveNow": false,
  "panels": [
    {
      "datasource": {
        "type": "postgres",
        "uid": "P8E80F9AEF21F6940"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "id": 2,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "single",
          "sort": "none"
        }
      },
      "title": "PR Reviews Over Time",
      "type": "timeseries",
      "targets": [
        {
          "datasource": {
            "type": "postgres",
            "uid": "P8E80F9AEF21F6940"
          },
          "editorMode": "code",
          "format": "time_series",
          "rawQuery": true,
          "rawSql": "SELECT\n  pr.created_at as time,\n  count(*) as count,\n  pr.analysis_mode\nFROM\n  pr_reviews pr\nGROUP BY\n  pr.created_at,\n  pr.analysis_mode\nORDER BY\n  pr.created_at ASC",
          "refId": "A",
          "sql": {
            "columns": [
              {
                "parameters": [],
                "type": "function"
              }
            ],
            "groupBy": [
              {
                "property": {
                  "type": "string"
                },
                "type": "groupBy"
              }
            ],
            "limit": 50
          }
        }
      ]
    }
  ],
  "refresh": "",
  "schemaVersion": 38,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-6h",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "CodeQual PR Analysis",
  "uid": "fde333f3-37b4-445d-8f05-24695a333440",
  "version": 1,
  "weekStart": ""
}
EOF

echo "Grafana configuration created successfully."
echo "To start Grafana, run:"
echo "docker-compose -f docker-compose.grafana.yml up -d"
echo ""
echo "Then visit: http://localhost:3000"
echo "Username: admin"
echo "Password: admin"
echo ""
echo "The Supabase PostgreSQL datasource has been configured automatically."
echo "Sample dashboard available at: http://localhost:3000/d/fde333f3-37b4-445d-8f05-24695a333440/codequal-pr-analysis"

# Make the script executable
chmod +x "$SCRIPT_DIR/setup-local-grafana.sh"