#!/usr/bin/env npx ts-node

/**
 * Add execution time metrics by repository size
 */

import * as fs from 'fs';
import * as path from 'path';

function addExecutionTimeMetrics() {
  console.log('⏱️  Adding execution time metrics by repository size...\n');
  
  // Read the optimized dashboard
  const dashboardPath = path.join(__dirname, 'codequal-dashboard-optimized.json');
  const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf-8'));
  
  // Add overall average execution time stat panel
  const avgExecutionTimePanel = {
    "datasource": { "type": "postgres", "uid": "" },
    "fieldConfig": {
      "defaults": {
        "color": { "mode": "thresholds" },
        "mappings": [],
        "thresholds": {
          "mode": "absolute",
          "steps": [
            { "color": "green", "value": null },
            { "color": "yellow", "value": 3000 },
            { "color": "orange", "value": 5000 },
            { "color": "red", "value": 10000 }
          ]
        },
        "unit": "ms",
        "decimals": 0
      }
    },
    "gridPos": { "h": 4, "w": 6, "x": 0, "y": 20 },
    "id": 10,
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
        "rawSql": "SELECT AVG(report_time) as value FROM (\n  SELECT pr_number, AVG(duration_ms) as report_time \n  FROM agent_activity \n  WHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT\n  GROUP BY pr_number\n) as report_times",
        "refId": "A"
      }
    ],
    "title": "Avg Execution Time per Report",
    "type": "stat"
  };
  
  // Add execution time by repo size bar chart
  const executionByRepoSizeChart = {
    "datasource": { "type": "postgres", "uid": "" },
    "fieldConfig": {
      "defaults": {
        "color": { "mode": "palette-classic" },
        "custom": {
          "axisCenteredZero": false,
          "axisColorMode": "text",
          "axisLabel": "Time (ms)",
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
            "mode": "none"
          },
          "thresholdsStyle": { "mode": "off" }
        },
        "mappings": [
          {
            "options": {
              "small": { "index": 0, "text": "Small Repos" },
              "medium": { "index": 1, "text": "Medium Repos" },
              "large": { "index": 2, "text": "Large Repos" }
            },
            "type": "value"
          }
        ],
        "unit": "ms"
      },
      "overrides": [
        {
          "matcher": { "id": "byName", "options": "small" },
          "properties": [{ "id": "color", "value": { "fixedColor": "green", "mode": "fixed" } }]
        },
        {
          "matcher": { "id": "byName", "options": "medium" },
          "properties": [{ "id": "color", "value": { "fixedColor": "yellow", "mode": "fixed" } }]
        },
        {
          "matcher": { "id": "byName", "options": "large" },
          "properties": [{ "id": "color", "value": { "fixedColor": "red", "mode": "fixed" } }]
        }
      ]
    },
    "gridPos": { "h": 8, "w": 12, "x": 6, "y": 20 },
    "id": 11,
    "options": {
      "legend": {
        "calcs": [],
        "displayMode": "list",
        "placement": "bottom",
        "showLegend": true
      },
      "orientation": "horizontal",
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
        "rawSql": "SELECT \n  UPPER(repository_size) as \"Repository Size\",\n  ROUND(AVG(duration_ms)) as \"Avg Time (ms)\"\nFROM agent_activity \nWHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT\n  AND repository_size IS NOT NULL\nGROUP BY repository_size\nORDER BY \n  CASE repository_size \n    WHEN 'small' THEN 1\n    WHEN 'medium' THEN 2\n    WHEN 'large' THEN 3\n  END",
        "refId": "A"
      }
    ],
    "title": "Average Execution Time by Repository Size",
    "type": "barchart"
  };
  
  // Add detailed execution time table
  const executionTimeDetailsTable = {
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
          "matcher": { "id": "byName", "options": "Avg Time (ms)" },
          "properties": [
            { "id": "unit", "value": "ms" },
            { "id": "decimals", "value": 0 },
            { "id": "custom.width", "value": 120 }
          ]
        },
        {
          "matcher": { "id": "byName", "options": "Min Time (ms)" },
          "properties": [
            { "id": "unit", "value": "ms" },
            { "id": "decimals", "value": 0 },
            { "id": "custom.width", "value": 120 }
          ]
        },
        {
          "matcher": { "id": "byName", "options": "Max Time (ms)" },
          "properties": [
            { "id": "unit", "value": "ms" },
            { "id": "decimals", "value": 0 },
            { "id": "custom.width", "value": 120 }
          ]
        },
        {
          "matcher": { "id": "byName", "options": "Reports" },
          "properties": [{ "id": "custom.width", "value": 80 }]
        },
        {
          "matcher": { "id": "byName", "options": "Repo Size" },
          "properties": [{ "id": "custom.width", "value": 100 }]
        },
        {
          "matcher": { "id": "byName", "options": "Avg Cost" },
          "properties": [
            { "id": "unit", "value": "currencyUSD" },
            { "id": "decimals", "value": 4 },
            { "id": "custom.width", "value": 100 }
          ]
        }
      ]
    },
    "gridPos": { "h": 8, "w": 6, "x": 18, "y": 20 },
    "id": 12,
    "options": {
      "showHeader": true,
      "sortBy": [{ "desc": false, "displayName": "Repo Size" }]
    },
    "targets": [
      {
        "datasource": { "type": "postgres", "uid": "" },
        "format": "table",
        "rawQuery": true,
        "rawSql": "SELECT \n  UPPER(repository_size) as \"Repo Size\",\n  COUNT(DISTINCT pr_number) as \"Reports\",\n  ROUND(AVG(duration_ms)) as \"Avg Time (ms)\",\n  ROUND(MIN(duration_ms)) as \"Min Time (ms)\",\n  ROUND(MAX(duration_ms)) as \"Max Time (ms)\",\n  ROUND(AVG(cost)::numeric, 4) as \"Avg Cost\"\nFROM agent_activity \nWHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT\n  AND repository_size IS NOT NULL\nGROUP BY repository_size\nORDER BY \n  CASE repository_size \n    WHEN 'small' THEN 1\n    WHEN 'medium' THEN 2\n    WHEN 'large' THEN 3\n  END",
        "refId": "A"
      }
    ],
    "title": "Execution Stats by Size",
    "type": "table"
  };
  
  // Add time distribution gauge panel
  const timeDistributionGauge = {
    "datasource": { "type": "postgres", "uid": "" },
    "fieldConfig": {
      "defaults": {
        "color": { "mode": "thresholds" },
        "mappings": [],
        "max": 10000,
        "min": 0,
        "thresholds": {
          "mode": "absolute",
          "steps": [
            { "color": "green", "value": null },
            { "color": "yellow", "value": 2000 },
            { "color": "orange", "value": 4000 },
            { "color": "red", "value": 6000 }
          ]
        },
        "unit": "ms"
      },
      "overrides": [
        {
          "matcher": { "id": "byName", "options": "Small" },
          "properties": [
            { "id": "displayName", "value": "Small Repos" },
            { "id": "max", "value": 3000 }
          ]
        },
        {
          "matcher": { "id": "byName", "options": "Medium" },
          "properties": [
            { "id": "displayName", "value": "Medium Repos" },
            { "id": "max", "value": 5000 }
          ]
        },
        {
          "matcher": { "id": "byName", "options": "Large" },
          "properties": [
            { "id": "displayName", "value": "Large Repos" },
            { "id": "max", "value": 10000 }
          ]
        }
      ]
    },
    "gridPos": { "h": 4, "w": 6, "x": 0, "y": 24 },
    "id": 13,
    "options": {
      "orientation": "auto",
      "reduceOptions": {
        "values": false,
        "calcs": ["lastNotNull"],
        "fields": ""
      },
      "showThresholdLabels": false,
      "showThresholdMarkers": true,
      "text": {}
    },
    "pluginVersion": "9.5.2",
    "targets": [
      {
        "datasource": { "type": "postgres", "uid": "" },
        "format": "table",
        "rawQuery": true,
        "rawSql": "SELECT \n  INITCAP(repository_size) as metric,\n  ROUND(AVG(duration_ms)) as value\nFROM agent_activity \nWHERE timestamp > (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::BIGINT\n  AND repository_size IS NOT NULL\nGROUP BY repository_size",
        "refId": "A"
      }
    ],
    "title": "Performance by Size",
    "type": "gauge"
  };
  
  // Add the new panels to the dashboard
  dashboard.panels.push(avgExecutionTimePanel);
  dashboard.panels.push(executionByRepoSizeChart);
  dashboard.panels.push(executionTimeDetailsTable);
  dashboard.panels.push(timeDistributionGauge);
  
  // Update dashboard metadata
  dashboard.title = "CodeQual Performance Dashboard - Complete";
  dashboard.uid = "codequal-complete";
  dashboard.version = 2;
  dashboard.description = "Complete performance monitoring with execution time analysis by repository size";
  
  // Save the enhanced dashboard
  const outputPath = path.join(__dirname, 'codequal-dashboard-complete.json');
  fs.writeFileSync(outputPath, JSON.stringify(dashboard, null, 2));
  
  console.log('✅ Complete dashboard created: codequal-dashboard-complete.json\n');
  console.log('⏱️  New Execution Time Metrics Added:');
  console.log('   • Average Execution Time per Report (overall)');
  console.log('   • Execution Time by Repository Size (bar chart)');
  console.log('   • Detailed Statistics Table (min/max/avg by size)');
  console.log('   • Performance Gauges (visual indicators)\n');
  console.log('📊 Expected Time Ranges:');
  console.log('   • Small repos: 500-2000ms');
  console.log('   • Medium repos: 1500-4000ms');
  console.log('   • Large repos: 3000-8000ms\n');
  console.log('📝 Import Instructions:');
  console.log('   1. Go to Dashboards → Import');
  console.log('   2. Upload: codequal-dashboard-complete.json');
  console.log('   3. Select your Supabase datasource');
  console.log('   4. Click Import');
}

addExecutionTimeMetrics();