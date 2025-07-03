import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Simple health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'API service is starting up...'
  });
});

// Simple ready check
app.get('/ready', (req, res) => {
  res.json({ 
    ready: false,
    message: 'Service is still initializing...'
  });
});

app.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});