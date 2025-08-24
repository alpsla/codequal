#!/usr/bin/env npx ts-node

/**
 * Create an optimized dashboard layout with better visual organization
 */

import * as fs from 'fs';
import * as path from 'path';

function createOptimizedDashboard() {
  console.log('🎨 Creating optimized dashboard layout...\n');
  
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
      // Row 1: Key Metrics (4 equal panels)
      {
        "datasource": { "type": "postgres", "uid": "" },
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "thresholds" },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "blue", "value": 100 }
              ]
            },
            "unit": "short"
          }
        },
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 },
        "id": 1,
        "options": {
          "colorMode": "value",
          "graphMode": "area",
          "justifyMode": "center",
          "orientation": "auto",
          "reduceOptions": {
            "calcs": ["lastNotNull"],
            "fields": "",
            "values": false
          },
          "text": {},
          "textMode": "auto"
        },
        "targets": [
          {
            "datasource": { "type": "postgres", "uid": "" },
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT COUNT(*) as value FROM agent_activity WHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT",
            "refId": "A"
          }
        ],
        "title": "Total Operations",
        "type": "stat"
      },
      {
        "datasource": { "type": "postgres", "uid": "" },
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "thresholds" },
            "mappings": [],
            "thresholds": {
              "mode": "percentage",
              "steps": [
                { "color": "red", "value": null },
                { "color": "orange", "value": 70 },
                { "color": "green", "value": 90 }
              ]
            },
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        },
        "gridPos": { "h": 4, "w": 6, "x": 6, "y": 0 },
        "id": 2,
        "options": {
          "colorMode": "value",
          "graphMode": "area",
          "justifyMode": "center",
          "orientation": "auto",
          "reduceOptions": {
            "calcs": ["lastNotNull"],
            "fields": "",
            "values": false
          },
          "text": {},
          "textMode": "auto"
        },
        "targets": [
          {
            "datasource": { "type": "postgres", "uid": "" },
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT ROUND((SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) * 100), 1) as value FROM agent_activity WHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT",
            "refId": "A"
          }
        ],
        "title": "Success Rate",
        "type": "stat"
      },
      {
        "datasource": { "type": "postgres", "uid": "" },
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "thresholds" },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 10 },
                { "color": "orange", "value": 50 },
                { "color": "red", "value": 100 }
              ]
            },
            "unit": "currencyUSD",
            "decimals": 2
          }
        },
        "gridPos": { "h": 4, "w": 6, "x": 12, "y": 0 },
        "id": 3,
        "options": {
          "colorMode": "value",
          "graphMode": "area",
          "justifyMode": "center",
          "orientation": "auto",
          "reduceOptions": {
            "calcs": ["lastNotNull"],
            "fields": "",
            "values": false
          },
          "text": {},
          "textMode": "auto"
        },
        "targets": [
          {
            "datasource": { "type": "postgres", "uid": "" },
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
        "datasource": { "type": "postgres", "uid": "" },
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "thresholds" },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 0.05 },
                { "color": "orange", "value": 0.1 },
                { "color": "red", "value": 0.5 }
              ]
            },
            "unit": "currencyUSD",
            "decimals": 4
          }
        },
        "gridPos": { "h": 4, "w": 6, "x": 18, "y": 0 },
        "id": 4,
        "options": {
          "colorMode": "value",
          "graphMode": "area",
          "justifyMode": "center",
          "orientation": "auto",
          "reduceOptions": {
            "calcs": ["lastNotNull"],
            "fields": "",
            "values": false
          },
          "text": {},
          "textMode": "auto"
        },
        "targets": [
          {
            "datasource": { "type": "postgres", "uid": "" },
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT AVG(report_cost) as value FROM (SELECT pr_number, SUM(cost) as report_cost FROM agent_activity WHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT GROUP BY pr_number) as report_costs",
            "refId": "A"
          }
        ],
        "title": "Avg Cost per PR",
        "type": "stat"
      },
      
      // Row 2: Visual Charts
      {
        "datasource": { "type": "postgres", "uid": "" },
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "palette-classic" },
            "custom": {
              "hideFrom": {
                "tooltip": false,
                "viz": false,
                "legend": false
              }
            },
            "mappings": [],
            "unit": "short"
          }
        },
        "gridPos": { "h": 8, "w": 8, "x": 0, "y": 4 },
        "id": 5,
        "options": {
          "legend": {
            "displayMode": "table",
            "placement": "right",
            "showLegend": true,
            "values": ["value", "percent"]
          },
          "pieType": "donut",
          "reduceOptions": {
            "values": false,
            "calcs": ["lastNotNull"],
            "fields": ""
          },
          "tooltip": {
            "mode": "single",
            "sort": "none"
          }
        },
        "targets": [
          {
            "datasource": { "type": "postgres", "uid": "" },
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT agent_role as metric, COUNT(*) as value FROM agent_activity WHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT GROUP BY agent_role ORDER BY value DESC",
            "refId": "A"
          }
        ],
        "title": "Operations by Agent",
        "type": "piechart"
      },
      {
        "datasource": { "type": "postgres", "uid": "" },
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "palette-classic" },
            "custom": {
              "axisCenteredZero": false,
              "axisColorMode": "text",
              "axisLabel": "",
              "axisPlacement": "auto",
              "barAlignment": 0,
              "drawStyle": "bars",
              "fillOpacity": 80,
              "gradientMode": "none",
              "hideFrom": {
                "tooltip": false,
                "viz": false,
                "legend": false
              },
              "lineInterpolation": "linear",
              "lineWidth": 1,
              "pointSize": 5,
              "scaleDistribution": { "type": "linear" },
              "showPoints": "never",
              "spanNulls": false,
              "stacking": {
                "group": "A",
                "mode": "normal"
              },
              "thresholdsStyle": { "mode": "off" }
            },
            "mappings": [],
            "unit": "currencyUSD"
          }
        },
        "gridPos": { "h": 8, "w": 8, "x": 8, "y": 4 },
        "id": 6,
        "options": {
          "legend": {
            "calcs": [],
            "displayMode": "list",
            "placement": "bottom",
            "showLegend": true
          },
          "tooltip": {
            "mode": "multi",
            "sort": "desc"
          }
        },
        "targets": [
          {
            "datasource": { "type": "postgres", "uid": "" },
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT model_used as metric, SUM(cost) as \"Total Cost\" FROM agent_activity WHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT GROUP BY model_used ORDER BY \"Total Cost\" DESC",
            "refId": "A"
          }
        ],
        "title": "Cost by Model",
        "type": "barchart"
      },
      {
        "datasource": { "type": "postgres", "uid": "" },
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "palette-classic" },
            "custom": {
              "axisCenteredZero": false,
              "axisColorMode": "text",
              "axisLabel": "",
              "axisPlacement": "auto",
              "fillOpacity": 20,
              "gradientMode": "opacity",
              "hideFrom": {
                "tooltip": false,
                "viz": false,
                "legend": false
              },
              "lineWidth": 2,
              "scaleDistribution": { "type": "linear" }
            },
            "mappings": [],
            "unit": "short"
          }
        },
        "gridPos": { "h": 8, "w": 8, "x": 16, "y": 4 },
        "id": 7,
        "options": {
          "legend": {
            "calcs": [],
            "displayMode": "list",
            "placement": "bottom",
            "showLegend": false
          },
          "tooltip": {
            "mode": "single",
            "sort": "none"
          }
        },
        "targets": [
          {
            "datasource": { "type": "postgres", "uid": "" },
            "format": "time_series",
            "rawQuery": true,
            "rawSql": "SELECT \n  to_timestamp(timestamp/1000) AS time,\n  COUNT(*) as \"Operations\"\nFROM agent_activity\nWHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT\nGROUP BY to_timestamp(timestamp/1000)\nORDER BY time",
            "refId": "A"
          }
        ],
        "title": "Activity Timeline",
        "type": "timeseries"
      },
      
      // Row 3: Summary Tables
      {
        "datasource": { "type": "postgres", "uid": "" },
        "fieldConfig": {
          "defaults": {
            "custom": {
              "align": "auto",
              "cellOptions": { "type": "auto" },
              "inspect": false
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [{ "color": "green", "value": null }]
            }
          },
          "overrides": [
            {
              "matcher": { "id": "byName", "options": "Avg Duration" },
              "properties": [
                { "id": "unit", "value": "ms" },
                { "id": "custom.width", "value": 100 }
              ]
            },
            {
              "matcher": { "id": "byName", "options": "Total Cost" },
              "properties": [
                { "id": "unit", "value": "currencyUSD" },
                { "id": "decimals", "value": 4 },
                { "id": "custom.width", "value": 100 }
              ]
            },
            {
              "matcher": { "id": "byName", "options": "Success %" },
              "properties": [
                { "id": "unit", "value": "percent" },
                { "id": "custom.width", "value": 90 },
                { "id": "decimals", "value": 1 }
              ]
            },
            {
              "matcher": { "id": "byName", "options": "Operations" },
              "properties": [{ "id": "custom.width", "value": 90 }]
            }
          ]
        },
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 12 },
        "id": 8,
        "options": {
          "showHeader": true,
          "sortBy": [{ "desc": true, "displayName": "Operations" }]
        },
        "targets": [
          {
            "datasource": { "type": "postgres", "uid": "" },
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT \n  agent_role as \"Agent\",\n  COUNT(*) as \"Operations\",\n  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 1) as \"Success %\",\n  ROUND(AVG(duration_ms)) as \"Avg Duration\",\n  ROUND(SUM(cost)::numeric, 4) as \"Total Cost\"\nFROM agent_activity \nWHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT\nGROUP BY agent_role\nORDER BY \"Operations\" DESC",
            "refId": "A"
          }
        ],
        "title": "Agent Performance Summary",
        "type": "table"
      },
      {
        "datasource": { "type": "postgres", "uid": "" },
        "fieldConfig": {
          "defaults": {
            "custom": {
              "align": "auto",
              "cellOptions": { "type": "auto" },
              "inspect": false
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [{ "color": "green", "value": null }]
            }
          },
          "overrides": [
            {
              "matcher": { "id": "byName", "options": "Cost" },
              "properties": [
                { "id": "unit", "value": "currencyUSD" },
                { "id": "decimals", "value": 4 },
                { "id": "custom.width", "value": 80 }
              ]
            },
            {
              "matcher": { "id": "byName", "options": "PR" },
              "properties": [{ "id": "custom.width", "value": 60 }]
            },
            {
              "matcher": { "id": "byName", "options": "Ops" },
              "properties": [{ "id": "custom.width", "value": 50 }]
            },
            {
              "matcher": { "id": "byName", "options": "Repository" },
              "properties": [{ "id": "custom.width", "value": 250 }]
            }
          ]
        },
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 12 },
        "id": 9,
        "options": {
          "showHeader": true,
          "sortBy": [{ "desc": true, "displayName": "Cost" }]
        },
        "targets": [
          {
            "datasource": { "type": "postgres", "uid": "" },
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT \n  pr_number as \"PR\",\n  REPLACE(repository_url, 'https://github.com/', '') as \"Repository\",\n  COUNT(*) as \"Ops\",\n  ROUND(SUM(cost)::numeric, 4) as \"Cost\"\nFROM agent_activity \nWHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT\nGROUP BY pr_number, repository_url\nORDER BY \"Cost\" DESC\nLIMIT 10",
            "refId": "A"
          }
        ],
        "title": "Top 10 PRs by Cost",
        "type": "table"
      }
    ],
    "refresh": "30s",
    "schemaVersion": 38,
    "style": "dark",
    "tags": ["codequal", "performance", "monitoring"],
    "templating": { "list": [] },
    "time": { "from": "now-24h", "to": "now" },
    "timepicker": {},
    "timezone": "",
    "title": "CodeQual Performance Dashboard - Optimized",
    "uid": "codequal-optimized",
    "version": 1,
    "weekStart": ""
  };
  
  const outputPath = path.join(__dirname, 'codequal-dashboard-optimized.json');
  fs.writeFileSync(outputPath, JSON.stringify(dashboard, null, 2));
  
  console.log('✅ Optimized dashboard created: codequal-dashboard-optimized.json\n');
  console.log('🎨 Layout Features:');
  console.log('   • Row 1: 4 key metrics evenly spaced');
  console.log('   • Row 2: Visual charts (pie, bar, timeline)');
  console.log('   • Row 3: Summary tables side by side');
  console.log('   • Clean, professional appearance');
  console.log('   • Optimized column widths for readability\n');
  console.log('📊 Import Instructions:');
  console.log('   1. Go to Dashboards → Import');
  console.log('   2. Upload: codequal-dashboard-optimized.json');
  console.log('   3. Select your Supabase datasource');
  console.log('   4. Click Import');
}

createOptimizedDashboard();