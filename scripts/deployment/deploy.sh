#!/bin/bash
# Simple build and deploy script for CodeQual development

# Default values
SERVICE="api"
ENV="dev"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --service=*)
      SERVICE="${1#*=}"
      shift
      ;;
    --env=*)
      ENV="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown parameter: $1"
      exit 1
      ;;
  esac
done

echo "Deploying $SERVICE to $ENV environment..."

# Build Docker image
docker build -t iad.ocir.io/idzaw9ddo1h5/codequal/$SERVICE:$ENV ./services/$SERVICE

# Push to registry
docker push iad.ocir.io/idzaw9ddo1h5/codequal/$SERVICE:$ENV

# Update Kubernetes deployment
kubectl set image deployment/$SERVICE $SERVICE=iad.ocir.io/idzaw9ddo1h5/codequal/$SERVICE:$ENV -n codequal-$ENV

echo "Deployment complete!"



# # Deploy API to dev
# ./deploy.sh --service=api --env=dev

# # Deploy worker to dev
# ./deploy.sh --service=worker --env=dev