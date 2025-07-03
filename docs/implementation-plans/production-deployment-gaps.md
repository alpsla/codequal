# Production Deployment: Filling the Gaps

## 📋 What We Have vs What We Need

### ✅ Already Implemented:
- Supabase integration (just needs production instance)
- Grafana monitoring (ready to deploy)
- Security services (comprehensive)
- Authentication & rate limiting
- API documentation
- CI/CD pipeline basics

### ❌ Actual Gaps to Fill:

## 🚀 Week 1: DigitalOcean Production Setup

### Day 1-2: Infrastructure Provisioning
```bash
# 1. Create DigitalOcean Kubernetes Cluster
doctl kubernetes cluster create codequal-prod \
  --region nyc1 \
  --node-pool "name=worker;size=s-2vcpu-4gb;count=3"

# 2. Set up Managed PostgreSQL
doctl databases create codequal-db \
  --engine pg \
  --region nyc1 \
  --size db-s-2vcpu-4gb \
  --num-nodes 2

# 3. Create Spaces for file storage
doctl spaces create codequal-reports \
  --region nyc3
```

### Day 3: Secrets & Configuration
```yaml
# k8s/production/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: codequal-secrets
type: Opaque
stringData:
  SUPABASE_URL: "https://your-project.supabase.co"
  SUPABASE_SERVICE_KEY: "your-service-key"
  OPENAI_API_KEY: "your-api-key"
  GITHUB_APP_ID: "your-app-id"
  GITHUB_PRIVATE_KEY: |
    -----BEGIN RSA PRIVATE KEY-----
    your-key-here
    -----END RSA PRIVATE KEY-----
```

### Day 4-5: Deploy Core Services
```yaml
# k8s/production/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: codequal-api
  template:
    metadata:
      labels:
        app: codequal-api
    spec:
      containers:
      - name: api
        image: registry.digitalocean.com/codequal/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: codequal-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### Day 6-7: Monitoring & Logging
```bash
# Deploy monitoring stack
helm install prometheus prometheus-community/kube-prometheus-stack
helm install loki grafana/loki-stack
helm install grafana grafana/grafana \
  --set adminPassword=secure-password

# Configure Grafana dashboards
kubectl apply -f k8s/monitoring/dashboards/
```

## 🔧 Week 2: Production Hardening

### Security Enhancements
```nginx
# nginx-ingress configuration
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: codequal-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-ciphers: "HIGH:!aNULL:!MD5"
spec:
  tls:
  - hosts:
    - api.codequal.com
    secretName: codequal-tls
  rules:
  - host: api.codequal.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: codequal-api
            port:
              number: 3000
```

### Database Optimization
```sql
-- Production indexes
CREATE INDEX idx_analysis_created ON analysis_reports(created_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Partitioning for large tables
CREATE TABLE analysis_reports_2024 PARTITION OF analysis_reports
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Automated Backups
```yaml
# cronjob for database backups
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:14
            command:
            - sh
            - -c
            - |
              pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
              s3cmd put backup-*.sql.gz s3://codequal-backups/
              s3cmd ls s3://codequal-backups/ | head -n -7 | awk '{print $4}' | xargs s3cmd del
```

## 💰 Quick Stripe Integration (When Ready)

### 1. Install Dependencies
```bash
npm install stripe
npm install --save-dev @types/stripe
```

### 2. Initialize Stripe
```typescript
// services/stripe-service.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function createCheckoutSession(
  userId: string,
  priceId: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${process.env.APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/pricing`,
    metadata: {
      userId,
    },
  });
  
  return session.url!;
}
```

### 3. Webhook Handler
```typescript
// routes/stripe-webhook.ts
export async function handleStripeWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const sig = req.headers['stripe-signature']!;
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    switch (event.type) {
      case 'checkout.session.completed':
        await activateSubscription(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await cancelSubscription(event.data.object);
        break;
    }
    
    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
```

## 📊 Production Costs Estimate

### DigitalOcean Monthly Costs:
- Kubernetes Cluster (3 nodes): $60
- Managed PostgreSQL: $60
- Spaces (Object Storage): $5
- Load Balancer: $12
- **Total: ~$137/month**

### Additional Services:
- Stripe: 2.9% + 30¢ per transaction
- Email (ConvertKit): $29-79/month
- Monitoring (if not self-hosted): $50/month
- **Total: ~$200-300/month**

## 🎯 Parallel Work Streams

### While Setting Up Business (Weeks 1-2):
1. **Technical**: Deploy to DigitalOcean, set up monitoring
2. **Marketing**: Build automation, create content pipeline
3. **Content**: Write 10 blog posts, create lead magnets
4. **Community**: Set up Discord/Slack, engage on Reddit

### After Business Setup (Weeks 3-4):
1. **Billing**: Integrate Stripe, test payment flows
2. **Launch**: Beta program → Paid launch
3. **Sales**: Outreach to early adopters
4. **Growth**: Iterate based on feedback

## 🚦 Go/No-Go Checklist for Launch

### Technical Readiness:
- [ ] API deployed and stable for 72 hours
- [ ] Monitoring shows 99.9% uptime
- [ ] Backup system tested
- [ ] Security scan passed
- [ ] Load testing completed

### Marketing Readiness:
- [ ] 10 blog posts published
- [ ] 500+ email subscribers
- [ ] Social accounts active
- [ ] Landing page converting >2%
- [ ] Support system ready

### Business Readiness:
- [ ] Company registered
- [ ] Bank account active
- [ ] Stripe account approved
- [ ] Terms of Service ready
- [ ] Privacy Policy compliant

Ready to start with the marketing automation setup while the business registration is in progress?