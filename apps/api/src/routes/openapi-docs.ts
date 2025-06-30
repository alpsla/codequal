import { Router } from 'express';
import { openapiSpecification } from '../config/openapi';

const router = Router();

// Serve OpenAPI documentation (without Swagger UI for now)
router.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CodeQual API Documentation</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow: auto; }
        a { color: #0066cc; }
      </style>
    </head>
    <body>
      <h1>CodeQual API Documentation</h1>
      <p>Welcome to the CodeQual API documentation.</p>
      <h2>Quick Links</h2>
      <ul>
        <li><a href="/docs/openapi.json">OpenAPI Specification (JSON)</a></li>
        <li><a href="https://docs.codequal.com/api">Full Documentation</a></li>
      </ul>
      <h2>Base URL</h2>
      <pre>https://api.codequal.com/v1</pre>
      <h2>Authentication</h2>
      <p>Include your API key in the X-API-Key header:</p>
      <pre>X-API-Key: ck_your_api_key_here</pre>
    </body>
    </html>
  `);
});

/**
 * @swagger
 * /openapi.json:
 *   get:
 *     summary: OpenAPI Specification
 *     description: Get the raw OpenAPI specification in JSON format
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/openapi.json', (_req, res) => {
  res.json(openapiSpecification);
});

export default router;