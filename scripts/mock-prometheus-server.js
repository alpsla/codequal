const express = require('express');
const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Mock metrics endpoint
app.get('/api/v1/query', (req, res) => {
  const query = req.query.query;
  const now = Date.now() / 1000;
  
  let value = 0;
  if (query.includes('deepwiki_disk_usage_percent')) {
    value = 20 + Math.sin(now / 300) * 5; // Oscillates between 15-25%
  } else if (query.includes('deepwiki_active_repositories')) {
    value = Math.floor(3 + Math.random() * 2);
  } else if (query.includes('deepwiki_disk_available_gb')) {
    value = 8;
  } else if (query.includes('deepwiki_repositories_analyzed_total')) {
    value = 156 + Math.floor(now / 3600);
  }
  
  res.json({
    status: 'success',
    data: {
      resultType: 'vector',
      result: [{
        metric: {},
        value: [now, value.toString()]
      }]
    }
  });
});

// Mock range query endpoint
app.get('/api/v1/query_range', (req, res) => {
  const query = req.query.query;
  const start = parseInt(req.query.start);
  const end = parseInt(req.query.end);
  const step = parseInt(req.query.step) || 60;
  
  const values = [];
  for (let t = start; t <= end; t += step) {
    let value = 0;
    if (query.includes('deepwiki_disk_usage_percent')) {
      value = 20 + Math.sin(t / 300) * 5;
    } else if (query.includes('deepwiki_active_repositories')) {
      value = Math.floor(3 + Math.sin(t / 600) * 2);
    }
    values.push([t, value.toString()]);
  }
  
  res.json({
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [{
        metric: {},
        values: values
      }]
    }
  });
});

const PORT = 9090;
app.listen(PORT, () => {
  console.log(`Mock Prometheus server running on http://localhost:${PORT}`);
  console.log('Configure Grafana to use http://localhost:9090 as Prometheus data source');
});