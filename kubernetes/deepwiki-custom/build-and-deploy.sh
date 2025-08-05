#!/bin/bash
# Build and Deploy Custom DeepWiki Image

set -e

# Configuration
REGISTRY="registry.digitalocean.com/codequal"
IMAGE_NAME="deepwiki-custom"
TAG="latest"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🔨 Building custom DeepWiki image..."
cd ${SCRIPT_DIR}
docker build -t ${FULL_IMAGE} .

echo "📤 Pushing to registry..."
docker push ${FULL_IMAGE}

echo "📦 Creating updated deployment..."
cat > ../deepwiki-deployment-custom.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deepwiki
  namespace: codequal-dev
  labels:
    app: deepwiki
spec:
  replicas: 1
  selector:
    matchLabels:
      app: deepwiki
  template:
    metadata:
      labels:
        app: deepwiki
    spec:
      containers:
      - name: deepwiki
        image: ${FULL_IMAGE}
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: frontend
        - containerPort: 8001
          name: api
        env:
        - name: SERVER_BASE_URL
          value: http://deepwiki-api:8001
        - name: NEXT_PUBLIC_SERVER_BASE_URL
          value: http://deepwiki-api:8001
        
        # API Keys
        - name: OPENROUTER_API_KEY
          valueFrom:
            secretKeyRef:
              name: deepwiki-api-keys
              key: OPENROUTER_API_KEY
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: deepwiki-api-keys
              key: OPENAI_API_KEY
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: deepwiki-api-keys
              key: GITHUB_TOKEN
              optional: true
        
        # Model configuration via environment
        - name: OPENAI_BASE_URL
          value: https://api.openai.com/v1
        - name: LLM_MODEL
          value: openai/gpt-4-turbo-preview
        - name: EMBEDDING_MODEL
          value: text-embedding-3-large
        - name: EMBEDDING_API_BASE
          value: https://api.openai.com/v1
        - name: EMBEDDING_DIMENSIONS
          value: "3072"
        
        resources:
          requests:
            memory: "1Gi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1"
        volumeMounts:
        - mountPath: /root/.adalflow
          name: deepwiki-data
      volumes:
      - name: deepwiki-data
        persistentVolumeClaim:
          claimName: deepwiki-data
      imagePullSecrets:
      - name: registry-codequal
EOF

echo "🚀 Deploying custom DeepWiki..."
kubectl apply -f ../deepwiki-deployment-custom.yaml

echo "✅ Done! Custom DeepWiki image deployed."
echo ""
echo "Next steps:"
echo "1. Wait for pod to be ready: kubectl wait --for=condition=Ready pod -l app=deepwiki -n codequal-dev"
echo "2. Check logs: kubectl logs -n codequal-dev -l app=deepwiki"
echo "3. Test with: cd ../../packages/agents && npx ts-node test-deepwiki-simple.ts"
