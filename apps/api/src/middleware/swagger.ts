import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { openapiSpecification } from '../config/openapi';

// Swagger JSDoc options
const options: swaggerJsdoc.Options = {
  definition: openapiSpecification,
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../docs/*.yaml'),
  ],
};

// Generate the OpenAPI specification
const spec = swaggerJsdoc(options) as any;

// Load additional endpoint documentation
const docsToLoad = ['auth-endpoints.yaml', 'billing-endpoints.yaml'];

docsToLoad.forEach(docFile => {
  try {
    const docPath = path.join(__dirname, '../docs', docFile);
    if (fs.existsSync(docPath)) {
      const doc = yaml.load(fs.readFileSync(docPath, 'utf8')) as any;
      
      // Merge endpoints into the main spec
      if (doc && doc.paths) {
        spec.paths = { ...spec.paths, ...doc.paths };
      }
      
      // Merge schemas if any
      if (doc && doc.components && doc.components.schemas) {
        spec.components = spec.components || {};
        spec.components.schemas = { ...spec.components.schemas, ...doc.components.schemas };
      }
      
      // Add tags if not exists
      if (doc && doc.tags && Array.isArray(doc.tags)) {
        spec.tags = spec.tags || [];
        doc.tags.forEach((tag: any) => {
          if (!spec.tags.find((t: any) => t.name === tag.name)) {
            spec.tags.push(tag);
          }
        });
      }
    }
  } catch (error) {
    console.error(`Failed to load ${docFile}:`, error);
  }
});

// Custom CSS for better styling
const customCss = `
  .swagger-ui .topbar { display: none }
  .swagger-ui .info .title { color: #333 }
  .swagger-ui .scheme-container { background: #f7f7f7; padding: 20px; border-radius: 5px; }
`;

// Swagger UI options
const swaggerUiOptions = {
  customCss,
  customSiteTitle: 'CodeQual API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
};

export function setupSwagger(app: Express) {
  // Serve Swagger UI at /docs
  app.use('/docs', swaggerUi.serve);
  app.get('/docs', swaggerUi.setup(spec, swaggerUiOptions));
  
  // Also serve at /api/docs for consistency
  app.use('/api/docs', swaggerUi.serve);
  app.get('/api/docs', swaggerUi.setup(spec, swaggerUiOptions));
  
  // Serve raw OpenAPI spec
  app.get('/docs/openapi.json', (req, res) => {
    res.json(spec);
  });
  
  app.get('/api/docs/openapi.json', (req, res) => {
    res.json(spec);
  });
  
  // Serve OpenAPI spec as YAML
  app.get('/docs/openapi.yaml', (req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.send(yaml.dump(spec));
  });
  
  app.get('/api/docs/openapi.yaml', (req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.send(yaml.dump(spec));
  });
}

export { spec as openapiSpec };