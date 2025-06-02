#!/bin/bash

# Setup Environment Configuration for CodeQual
# This script helps you configure your .env file with all required settings

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 CodeQual Environment Setup${NC}"
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to backup and recreate it? (y/n): " RECREATE
    if [ "$RECREATE" = "y" ] || [ "$RECREATE" = "Y" ]; then
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        echo -e "${GREEN}✅ Existing .env backed up${NC}"
    else
        echo -e "${BLUE}ℹ️  Use the existing .env file or edit it manually${NC}"
        echo "Refer to .env.example for all available options"
        exit 0
    fi
fi

# Copy from example
if [ ! -f ".env.example" ]; then
    echo -e "${RED}❌ Error: .env.example not found${NC}"
    exit 1
fi

cp .env.example .env
echo -e "${GREEN}✅ Created .env from template${NC}"
echo ""

# Interactive configuration
echo -e "${BLUE}📝 Let's configure your environment settings${NC}"
echo ""

# Supabase Configuration
echo -e "${YELLOW}=== Supabase Configuration ===${NC}"
read -p "Supabase URL (https://your-project.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
read -s -p "Supabase JWT Secret: " SUPABASE_JWT_SECRET
echo ""

# Update .env file with Supabase settings
if [ ! -z "$SUPABASE_URL" ]; then
    sed -i.bak "s|SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|" .env
fi
if [ ! -z "$SUPABASE_ANON_KEY" ]; then
    sed -i.bak "s|SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" .env
fi
if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY|" .env
fi
if [ ! -z "$SUPABASE_JWT_SECRET" ]; then
    sed -i.bak "s|SUPABASE_JWT_SECRET=.*|SUPABASE_JWT_SECRET=$SUPABASE_JWT_SECRET|" .env
fi

echo ""
echo -e "${YELLOW}=== Grafana Configuration (Optional) ===${NC}"
read -p "Do you want to configure Grafana monitoring? (y/n): " SETUP_GRAFANA

if [ "$SETUP_GRAFANA" = "y" ] || [ "$SETUP_GRAFANA" = "Y" ]; then
    read -p "Grafana URL (https://your-grafana.com): " GRAFANA_URL
    read -p "Grafana API Key: " GRAFANA_API_KEY
    
    if [ ! -z "$GRAFANA_URL" ]; then
        sed -i.bak "s|GRAFANA_URL=.*|GRAFANA_URL=$GRAFANA_URL|" .env
    fi
    if [ ! -z "$GRAFANA_API_KEY" ]; then
        sed -i.bak "s|GRAFANA_API_KEY=.*|GRAFANA_API_KEY=$GRAFANA_API_KEY|" .env
    fi
    
    read -p "Prometheus URL (default: http://localhost:9090): " PROMETHEUS_URL
    if [ ! -z "$PROMETHEUS_URL" ]; then
        sed -i.bak "s|PROMETHEUS_URL=.*|PROMETHEUS_URL=$PROMETHEUS_URL|" .env
    fi
fi

echo ""
echo -e "${YELLOW}=== Alert Configuration (Optional) ===${NC}"
read -p "Do you want to configure security alerts? (y/n): " SETUP_ALERTS

if [ "$SETUP_ALERTS" = "y" ] || [ "$SETUP_ALERTS" = "Y" ]; then
    echo ""
    echo "Slack Integration:"
    read -p "Slack Webhook URL (optional): " SLACK_WEBHOOK_URL
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        sed -i.bak "s|SLACK_WEBHOOK_URL=.*|SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL|" .env
    fi
    
    echo ""
    echo "Email Alerts:"
    read -p "Alert Email Recipients (comma-separated, optional): " ALERT_EMAIL_RECIPIENTS
    if [ ! -z "$ALERT_EMAIL_RECIPIENTS" ]; then
        sed -i.bak "s|ALERT_EMAIL_RECIPIENTS=.*|ALERT_EMAIL_RECIPIENTS=$ALERT_EMAIL_RECIPIENTS|" .env
    fi
fi

echo ""
echo -e "${YELLOW}=== Application Configuration ===${NC}"
read -p "Environment (development/production) [development]: " NODE_ENV
NODE_ENV=${NODE_ENV:-development}
sed -i.bak "s|NODE_ENV=.*|NODE_ENV=$NODE_ENV|" .env

read -p "Application Port [3000]: " PORT
PORT=${PORT:-3000}
sed -i.bak "s|PORT=.*|PORT=$PORT|" .env

# Security Configuration
echo ""
echo -e "${YELLOW}=== Security Configuration ===${NC}"
read -p "Default Rate Limit (requests/hour) [1000]: " DEFAULT_RATE_LIMIT
DEFAULT_RATE_LIMIT=${DEFAULT_RATE_LIMIT:-1000}
sed -i.bak "s|DEFAULT_RATE_LIMIT=.*|DEFAULT_RATE_LIMIT=$DEFAULT_RATE_LIMIT|" .env

read -p "Critical Risk Threshold (0-100) [85]: " CRITICAL_RISK_THRESHOLD
CRITICAL_RISK_THRESHOLD=${CRITICAL_RISK_THRESHOLD:-85}
sed -i.bak "s|CRITICAL_RISK_THRESHOLD=.*|CRITICAL_RISK_THRESHOLD=$CRITICAL_RISK_THRESHOLD|" .env

# Clean up backup files
rm -f .env.bak

echo ""
echo -e "${GREEN}🎉 Environment configuration complete!${NC}"
echo ""

# Display configuration summary
echo -e "${BLUE}📋 Configuration Summary:${NC}"
echo "Environment: $NODE_ENV"
echo "Port: $PORT"
echo "Supabase URL: ${SUPABASE_URL:0:30}..."
echo "Grafana configured: $([ ! -z "$GRAFANA_URL" ] && echo "Yes" || echo "No")"
echo "Alerts configured: $([ ! -z "$SLACK_WEBHOOK_URL" ] || [ ! -z "$ALERT_EMAIL_RECIPIENTS" ] && echo "Yes" || echo "No")"
echo ""

# Validate configuration
echo -e "${BLUE}🔍 Validating configuration...${NC}"

VALIDATION_ERRORS=0

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ SUPABASE_URL is required${NC}"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY is required${NC}"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

if [ $VALIDATION_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Configuration validation passed${NC}"
else
    echo -e "${RED}❌ $VALIDATION_ERRORS validation errors found${NC}"
    echo "Please edit your .env file to fix these issues"
fi

echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "1. Review and edit .env file if needed"
echo "2. Run database setup: ./scripts/setup-supabase-schema.sh"
if [ ! -z "$GRAFANA_URL" ]; then
    echo "3. Run Grafana setup: ./scripts/setup-grafana-integration.sh"
fi
echo "4. Run tests: ./scripts/run-security-tests.sh"
echo ""
echo -e "${GREEN}✅ Setup complete! Check your .env file and run the setup scripts.${NC}"