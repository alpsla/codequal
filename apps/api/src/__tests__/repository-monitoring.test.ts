import request from 'supertest';
import express from 'express';
import monitoringRouter from '../routes/monitoring';
import deepwikiMetricsRouter from '../routes/deepwiki-metrics';
import deepwikiMetricsJsonRouter from '../routes/deepwiki-metrics-json';
import monitoringPublicRouter from '../routes/monitoring-public';

// Mock exec to avoid actual kubectl calls
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, callback) => {
    if (cmd.includes('df -BG')) {
      callback(null, { stdout: '/dev/sda1       100G  20G  80G  20% /root/.adalflow' });
    } else if (cmd.includes('ls -la')) {
      callback(null, { stdout: 'drwxr-xr-x 2 root root 4096 Jan 1 00:00 repo1\ndrwxr-xr-x 2 root root 4096 Jan 1 00:00 repo2' });
    } else if (cmd.includes('get pod')) {
      callback(null, { stdout: JSON.stringify({ items: [{ status: { phase: 'Running' } }] }) });
    } else {
      callback(null, { stdout: '' });
    }
  })
}));

// Mock logger
jest.mock('@codequal/core/utils', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

describe('Repository Storage Monitoring Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/monitoring', monitoringRouter);
    app.use('/', deepwikiMetricsRouter);
    app.use('/', deepwikiMetricsJsonRouter);
    app.use('/', monitoringPublicRouter);
  });

  afterAll(() => {
    // Clear any intervals that might have been set
    jest.clearAllTimers();
  });

  describe('GET /api/monitoring/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('vectorDB');
    });
  });

  describe('GET /api/monitoring/repository/metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/repository/metrics')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });
  });

  describe('GET /api/monitoring/repository/health', () => {
    it('should return repository storage health status', async () => {
      const response = await request(app)
        .get('/api/monitoring/repository/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('pod_count', 1);
    });
  });

  describe('GET /api/monitoring/repository/metrics.json', () => {
    it('should return JSON metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/repository/metrics.json')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('disk');
      expect(response.body.disk).toHaveProperty('totalGB', 100);
      expect(response.body.disk).toHaveProperty('usedGB', 20);
      expect(response.body.disk).toHaveProperty('percentUsed', 20);
    });
  });

  describe('GET /repository/metrics', () => {
    it('should return public repository metrics', async () => {
      const response = await request(app)
        .get('/repository/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('disk');
      expect(response.body).toHaveProperty('repos');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});