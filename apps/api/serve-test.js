const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve the test file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-e2e-complete.html'));
});

app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to run the E2E tests`);
});