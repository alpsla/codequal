# How to Add Data Source in Grafana

## Step 1: Access Data Sources
From your current dashboard view:
1. Click the **hamburger menu (☰)** in the top-left corner
2. Look for **Connections** or **Configuration** section
3. Click on **Data sources**

## Step 2: Add New Data Source
1. Click the **"Add new data source"** button
2. You'll see a list of available data source types

## Step 3: Choose Data Source Type

For DeepWiki monitoring, you have several options:

### Option A: PostgreSQL (Recommended for Supabase)
- Search for "PostgreSQL"
- Configure with your Supabase credentials:
  ```
  Host: [your-supabase-host].supabase.co:5432
  Database: postgres
  User: postgres
  Password: [your-password]
  SSL Mode: require
  ```

### Option B: Prometheus (If you want to use metrics endpoint)
- Search for "Prometheus"
- Configure:
  ```
  URL: http://localhost:3001
  Custom HTTP Headers:
    - Header: Authorization
    - Value: Bearer [your-jwt-token]
  ```

### Option C: JSON API (Simple option)
- Search for "JSON API" or "SimpleJson"
- Configure:
  ```
  URL: http://localhost:3001/api/monitoring/deepwiki
  ```

## Step 4: Test Connection
1. Click **"Save & Test"**
2. You should see "Data source is working" message

## Step 5: Update Dashboard
1. Go back to your imported dashboard
2. Edit each panel to use the new data source
3. Update queries based on your data source type