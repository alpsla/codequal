#!/usr/bin/env npx ts-node

/**
 * Auto-detect datasource UID and create a working dashboard
 * This script creates a dashboard that will work with ANY PostgreSQL datasource
 */

import * as fs from 'fs';
import * as path from 'path';

function createAutoDashboard() {
  console.log('Creating auto-detecting dashboard...\n');
  
  // This dashboard will work with ANY PostgreSQL datasource named "Supabase"
  const dashboard = {
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
          "type": "dashboard"
        }
      ]
    },
    "editable": true,
    "fiscalYearStartMonth": 0,
    "graphTooltip": 0,
    "id": null,
    "links": [],
    "liveNow": false,
    "panels": [
      {
        "datasource": {
          "type": "postgres",
          "uid": "" // Empty UID - Grafana will use default
        },
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                }
              ]
            }
          },
          "overrides": []
        },
        "gridPos": {
          "h": 4,
          "w": 8,
          "x": 0,
          "y": 0
        },
        "id": 1,
        "options": {
          "colorMode": "value",
          "graphMode": "area",
          "justifyMode": "auto",
          "orientation": "auto",
          "reduceOptions": {
            "calcs": [
              "lastNotNull"
            ],
            "fields": "",
            "values": false
          },
          "text": {},
          "textMode": "auto"
        },
        "pluginVersion": "9.5.2",
        "targets": [
          {
            "datasource": {
              "type": "postgres",
              "uid": ""
            },
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT COUNT(*) as value FROM agent_activity WHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT",
            "refId": "A"
          }
        ],
        "title": "Total Operations (24h)",
        "type": "stat"
      },
      {
        "datasource": {
          "type": "postgres",
          "uid": ""
        },
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "red",
                  "value": null
                },
                {
                  "color": "yellow",
                  "value": 80
                },
                {
                  "color": "green",
                  "value": 95
                }
              ]
            },
            "unit": "percent"
          },
          "overrides": []
        },
        "gridPos": {
          "h": 4,
          "w": 8,
          "x": 8,
          "y": 0
        },
        "id": 2,
        "options": {
          "colorMode": "value",
          "graphMode": "area",
          "justifyMode": "auto",
          "orientation": "auto",
          "reduceOptions": {
            "calcs": [
              "lastNotNull"
            ],
            "fields": "",
            "values": false
          },
          "text": {},
          "textMode": "auto"
        },
        "pluginVersion": "9.5.2",
        "targets": [
          {
            "datasource": {
              "type": "postgres",
              "uid": ""
            },
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT (SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) * 100) as value FROM agent_activity WHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT",
            "refId": "A"
          }
        ],
        "title": "Success Rate %",
        "type": "stat"
      },
      {
        "datasource": {
          "type": "postgres",
          "uid": ""
        },
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                }
              ]
            },
            "unit": "currencyUSD"
          },
          "overrides": []
        },
        "gridPos": {
          "h": 4,
          "w": 8,
          "x": 16,
          "y": 0
        },
        "id": 3,
        "options": {
          "colorMode": "value",
          "graphMode": "area",
          "justifyMode": "auto",
          "orientation": "auto",
          "reduceOptions": {
            "calcs": [
              "lastNotNull"
            ],
            "fields": "",
            "values": false
          },
          "text": {},
          "textMode": "auto"
        },
        "pluginVersion": "9.5.2",
        "targets": [
          {
            "datasource": {
              "type": "postgres",
              "uid": ""
            },
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT COALESCE(SUM(cost), 0) as value FROM agent_activity WHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT",
            "refId": "A"
          }
        ],
        "title": "Total Cost (24h)",
        "type": "stat"
      },
      {
        "datasource": {
          "type": "postgres",
          "uid": ""
        },
        "fieldConfig": {
          "defaults": {
            "custom": {
              "align": "auto",
              "cellOptions": {
                "type": "auto"
              },
              "inspect": false
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                }
              ]
            }
          },
          "overrides": []
        },
        "gridPos": {
          "h": 10,
          "w": 24,
          "x": 0,
          "y": 4
        },
        "id": 4,
        "options": {
          "showHeader": true,
          "sortBy": []
        },
        "pluginVersion": "9.5.2",
        "targets": [
          {
            "datasource": {
              "type": "postgres",
              "uid": ""
            },
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT \n  agent_role as \"Agent\",\n  model_used as \"Model\",\n  COUNT(*) as \"Operations\",\n  SUM(CASE WHEN success THEN 1 ELSE 0 END) as \"Successful\",\n  ROUND(AVG(duration_ms)) as \"Avg Duration (ms)\",\n  ROUND(SUM(cost)::numeric, 2) as \"Total Cost ($)\"\nFROM agent_activity \nWHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT\nGROUP BY agent_role, model_used\nORDER BY \"Operations\" DESC\nLIMIT 20",
            "refId": "A"
          }
        ],
        "title": "Agent Activity Summary (Last 24 Hours)",
        "type": "table"
      }
    ],
    "refresh": "30s",
    "schemaVersion": 38,
    "style": "dark",
    "tags": ["codequal", "performance"],
    "templating": {
      "list": []
    },
    "time": {
      "from": "now-24h",
      "to": "now"
    },
    "timepicker": {},
    "timezone": "",
    "title": "CodeQual Performance - Auto",
    "uid": "codequal-auto",
    "version": 1,
    "weekStart": ""
  };
  
  const outputPath = path.join(__dirname, 'codequal-dashboard-auto.json');
  fs.writeFileSync(outputPath, JSON.stringify(dashboard, null, 2));
  
  console.log('✅ Dashboard created: codequal-dashboard-auto.json\n');
  console.log('📝 Import Instructions:\n');
  console.log('1. Go to Dashboards → Import');
  console.log('2. Upload: codequal-dashboard-auto.json');
  console.log('3. When prompted for datasource, select your "Supabase" PostgreSQL datasource');
  console.log('4. Click Import\n');
  console.log('This dashboard uses empty UIDs, so Grafana will automatically use your datasource!');
}

createAutoDashboard();