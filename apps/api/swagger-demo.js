const express = require('express');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const app = express();

// Load the OpenAPI specs
const authSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'src/docs/auth-endpoints.yaml'), 'utf8'));
const billingSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'src/docs/billing-endpoints.yaml'), 'utf8'));
const usersSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'src/docs/users-endpoints.yaml'), 'utf8'));
const reportsSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'src/docs/reports-endpoints.yaml'), 'utf8'));
const analysisSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'src/docs/analysis-endpoints.yaml'), 'utf8'));
const apiKeysSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'src/docs/api-keys-endpoints.yaml'), 'utf8'));
const vectorSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'src/docs/vector-endpoints.yaml'), 'utf8'));
const monitoringSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'src/docs/monitoring-endpoints.yaml'), 'utf8'));
const organizationsSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'src/docs/organizations-endpoints.yaml'), 'utf8'));

// Combine specs
const combinedSpec = {
  openapi: '3.0.0',
  info: {
    title: 'CodeQual API',
    version: '1.0.0',
    description: 'AI-powered code review API'
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    }
  ],
  paths: {
    ...authSpec.paths,
    ...billingSpec.paths,
    ...usersSpec.paths,
    ...reportsSpec.paths,
    ...analysisSpec.paths,
    ...apiKeysSpec.paths,
    ...vectorSpec.paths,
    ...monitoringSpec.paths,
    ...organizationsSpec.paths
  },
  components: {
    schemas: {
      ...((authSpec.components && authSpec.components.schemas) || {}),
      ...((billingSpec.components && billingSpec.components.schemas) || {}),
      ...((usersSpec.components && usersSpec.components.schemas) || {}),
      ...((reportsSpec.components && reportsSpec.components.schemas) || {}),
      ...((analysisSpec.components && analysisSpec.components.schemas) || {}),
      ...((apiKeysSpec.components && apiKeysSpec.components.schemas) || {}),
      ...((vectorSpec.components && vectorSpec.components.schemas) || {}),
      ...((monitoringSpec.components && monitoringSpec.components.schemas) || {}),
      ...((organizationsSpec.components && organizationsSpec.components.schemas) || {})
    },
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    }
  },
  tags: [
    ...(authSpec.tags || []),
    ...(billingSpec.tags || []),
    ...(usersSpec.tags || []),
    ...(reportsSpec.tags || []),
    ...(analysisSpec.tags || []),
    ...(apiKeysSpec.tags || []),
    ...(vectorSpec.tags || []),
    ...(monitoringSpec.tags || []),
    ...(organizationsSpec.tags || [])
  ]
};

// Serve Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(combinedSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CodeQual API Documentation'
}));

// Basic route
app.get('/', (req, res) => {
  res.send(`
    <h1>CodeQual API Documentation Demo</h1>
    <p>Visit <a href="/docs">/docs</a> to see the Swagger UI documentation</p>
  `);
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Swagger demo running at http://localhost:${PORT}`);
  console.log(`View documentation at http://localhost:${PORT}/docs`);
});