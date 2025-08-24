#!/usr/bin/env npx ts-node

/**
 * Add Average Cost per Report panel to the dashboard
 */

import * as fs from 'fs';
import * as path from 'path';

function addCostPerReportPanel() {
  console.log('📊 Adding Average Cost per Report panel...\n');
  
  // Read the existing auto dashboard
  const dashboardPath = path.join(__dirname, 'codequal-dashboard-auto.json');
  const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf-8'));
  
  // Add new panel for Average Cost per Report
  const costPerReportPanel = {
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
            },
            {
              "color": "yellow", 
              "value": 1
            },
            {
              "color": "red",
              "value": 5
            }
          ]
        },
        "unit": "currencyUSD"
      },
      "overrides": []
    },
    "gridPos": {
      "h": 4,
      "w": 6,
      "x": 18,
      "y": 0
    },
    "id": 5,
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
        "rawSql": "SELECT AVG(report_cost) as value FROM (\n  SELECT pr_number, SUM(cost) as report_cost \n  FROM agent_activity \n  WHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT\n  GROUP BY pr_number\n) as report_costs",
        "refId": "A"
      }
    ],
    "title": "Avg Cost per Report",
    "type": "stat"
  };
  
  // Add detailed breakdown panel
  const costBreakdownPanel = {
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
      "overrides": [
        {
          "matcher": {
            "id": "byName",
            "options": "Total Cost"
          },
          "properties": [
            {
              "id": "unit",
              "value": "currencyUSD"
            },
            {
              "id": "decimals",
              "value": 4
            }
          ]
        },
        {
          "matcher": {
            "id": "byName",
            "options": "Avg Duration (ms)"
          },
          "properties": [
            {
              "id": "unit",
              "value": "ms"
            }
          ]
        }
      ]
    },
    "gridPos": {
      "h": 10,
      "w": 24,
      "x": 0,
      "y": 14
    },
    "id": 6,
    "options": {
      "showHeader": true,
      "sortBy": [
        {
          "desc": true,
          "displayName": "Total Cost"
        }
      ]
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
        "rawSql": "SELECT \n  pr_number as \"PR Number\",\n  repository_url as \"Repository\",\n  COUNT(*) as \"Operations\",\n  COUNT(DISTINCT agent_role) as \"Agents Used\",\n  ROUND(SUM(cost)::numeric, 4) as \"Total Cost\",\n  ROUND(AVG(duration_ms)) as \"Avg Duration (ms)\",\n  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 1) as \"Success %\"\nFROM agent_activity \nWHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT\nGROUP BY pr_number, repository_url\nORDER BY \"Total Cost\" DESC\nLIMIT 15",
        "refId": "A"
      }
    ],
    "title": "Cost Analysis by Pull Request",
    "type": "table"
  };
  
  // Update Cost panel position to make room
  if (dashboard.panels[2]) {
    dashboard.panels[2].gridPos.x = 12;
  }
  
  // Add the new panels
  dashboard.panels.push(costPerReportPanel);
  dashboard.panels.push(costBreakdownPanel);
  
  // Update existing table panel position if needed
  if (dashboard.panels[3]) {
    dashboard.panels[3].gridPos.y = 4;
  }
  
  // Update dashboard title and version
  dashboard.title = "CodeQual Performance - Enhanced";
  dashboard.uid = "codequal-enhanced";
  dashboard.version = 2;
  
  // Save the enhanced dashboard
  const outputPath = path.join(__dirname, 'codequal-dashboard-enhanced.json');
  fs.writeFileSync(outputPath, JSON.stringify(dashboard, null, 2));
  
  console.log('✅ Enhanced dashboard created: codequal-dashboard-enhanced.json\n');
  console.log('📝 New panels added:');
  console.log('   1. Average Cost per Report - Shows the average cost across all PR analyses');
  console.log('   2. Cost Analysis by Pull Request - Detailed breakdown by PR\n');
  console.log('📊 Import Instructions:');
  console.log('   1. Go to Dashboards → Import');
  console.log('   2. Upload: codequal-dashboard-enhanced.json');
  console.log('   3. Select your Supabase datasource when prompted');
  console.log('   4. Click Import\n');
  console.log('The dashboard now includes:');
  console.log('   • Total Operations count');
  console.log('   • Success Rate percentage');
  console.log('   • Total Cost for all operations');
  console.log('   • Average Cost per Report (NEW!)');
  console.log('   • Agent Activity Summary table');
  console.log('   • Cost Analysis by Pull Request table (NEW!)');
}

addCostPerReportPanel();