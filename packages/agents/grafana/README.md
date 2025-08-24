# CodeQual Grafana Dashboard Setup

## 📊 Overview

This Grafana dashboard provides comprehensive real-time monitoring for CodeQual's agent performance, costs, and system health metrics.

## 🚀 Quick Setup

### Prerequisites
- Grafana instance with Supabase PostgreSQL datasource configured
- Access to the `agent_activity` table in Supabase

### Import Dashboard

1. **Open Grafana** and navigate to Dashboards → Import

2. **Import the Dashboard**:
   - Click "Upload JSON file"
   - Select `codequal-performance-dashboard.json`
   - Or copy/paste the JSON content directly

3. **Configure Data Source**:
   - Select your Supabase PostgreSQL data source from the dropdown
   - The dashboard will automatically use this for all panels

4. **Save Dashboard**:
   - Click "Import"
   - The dashboard will be available under "CodeQual Performance Dashboard"

## 📈 Dashboard Panels

### Key Metrics (Top Row)
- **Total Operations**: Count of all agent operations
- **Success Rate**: Percentage of successful operations
- **Avg Response Time**: Average processing duration
- **Total Cost**: Cumulative cost in USD
- **Fallback Rate**: Percentage of operations using fallback models
- **Active Models**: Number of unique models in use

### Performance Charts
1. **Performance Over Time**: Dual-axis chart showing response time and success rate trends
2. **Cost Distribution by Agent**: Donut chart showing cost breakdown
3. **Operations by Agent**: Stacked bar chart of successful/failed operations
4. **Agent Performance Details**: Detailed table with all metrics per agent/model

### Advanced Analytics
- **Response Time Heatmap**: Visual distribution of response times
- **Agent Activity Over Time**: Stacked area chart showing agent usage patterns

## 🎯 Features

### Auto-Refresh
- Dashboard auto-refreshes every 30 seconds
- Configurable refresh rate in dashboard settings

### Time Range Selection
- Default: Last 6 hours
- Easily adjustable with Grafana's time picker
- All panels update automatically

### Filtering
- **Agent Filter**: Focus on specific agents
- **Model Filter**: Analyze specific model performance
- Both filters support multi-select

### Alerting (Optional Setup)
You can add alerts for:
- Success rate dropping below 90%
- Average response time exceeding 1000ms
- Fallback rate exceeding 15%
- Cost exceeding daily budget

## 📊 Custom Queries

### Add Custom Panel
To add your own metrics, use these example queries:

```sql
-- Error rate by agent
SELECT 
  agent_role,
  ROUND(100.0 * SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) / COUNT(*), 2) as error_rate
FROM agent_activity
WHERE timestamp >= extract(epoch from now() - interval '1 hour')*1000
GROUP BY agent_role
ORDER BY error_rate DESC;

-- Token usage by repository
SELECT 
  repository_url,
  SUM(input_tokens + output_tokens) as total_tokens,
  ROUND(SUM(cost)::numeric, 2) as total_cost
FROM agent_activity
WHERE timestamp >= extract(epoch from now() - interval '24 hours')*1000
GROUP BY repository_url
ORDER BY total_tokens DESC
LIMIT 10;

-- Model performance comparison
SELECT 
  model_used,
  COUNT(*) as operations,
  ROUND(AVG(duration_ms), 0) as avg_duration,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate
FROM agent_activity
WHERE timestamp >= extract(epoch from now() - interval '7 days')*1000
GROUP BY model_used
ORDER BY operations DESC;
```

## 🔧 Troubleshooting

### No Data Showing
1. Verify Supabase connection in Data Sources
2. Check that `agent_activity` table exists and has data
3. Ensure timestamp values are in milliseconds
4. Verify your Grafana user has SELECT permissions

### Performance Issues
1. Add indexes to frequently queried columns:
```sql
CREATE INDEX idx_agent_activity_timestamp ON agent_activity(timestamp);
CREATE INDEX idx_agent_activity_agent_role ON agent_activity(agent_role);
CREATE INDEX idx_agent_activity_success ON agent_activity(success);
```

2. Consider data retention policy for old records

### Time Zone Issues
- Dashboard uses browser time zone by default
- Can be changed in Dashboard Settings → General → Timezone

## 📝 Dashboard Variables

The dashboard includes these template variables:
- `$datasource`: PostgreSQL data source selection
- `$agent`: Filter by agent role(s)
- `$model`: Filter by model(s)
- `$__range`: Time range for relative queries

## 🎨 Customization

### Color Schemes
- Success Rate: Red (<85%) → Yellow (85-95%) → Green (>95%)
- Response Time: Green (<500ms) → Yellow (500-1000ms) → Red (>1000ms)
- Fallback Rate: Green (<5%) → Yellow (5-15%) → Red (>15%)

### Panel Arrangement
- Drag and drop panels to rearrange
- Resize panels by dragging corners
- Add rows for better organization

## 📚 Additional Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [PostgreSQL in Grafana](https://grafana.com/docs/grafana/latest/datasources/postgres/)
- [Creating Alerts](https://grafana.com/docs/grafana/latest/alerting/)

## 💡 Tips

1. **Star the Dashboard**: Mark as favorite for quick access
2. **Create Playlists**: Rotate between different dashboards
3. **Export Data**: Use panel menu → Inspect → Data to export CSV
4. **Share Links**: Generate shareable links with current time range/filters
5. **Annotations**: Add deployment markers or incident notes

## 🔄 Updates

To update the dashboard:
1. Make changes in Grafana UI
2. Export via Dashboard Settings → JSON Model
3. Save to `codequal-performance-dashboard.json`
4. Commit to version control

---

For questions or issues, please contact the CodeQual team.