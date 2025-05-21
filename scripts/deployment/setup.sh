#!/bin/bash
# CodeQual and DeepWiki Deployment Setup Script
# Run this after gaining access to your Oracle Cloud VM

# Exit on error
set -e

echo "===== CodeQual and DeepWiki Deployment Setup ====="

# Update system packages
echo "Updating system packages..."
sudo dnf update -y
sudo dnf install -y dnf-utils device-mapper-persistent-data lvm2 wget curl nano git

# Install Docker
echo "Installing Docker..."
sudo dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
echo "Docker installed successfully."

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
echo "Docker Compose installed successfully."

# Configure Firewall
echo "Configuring firewall..."
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8001/tcp # CodeQual API
sudo firewall-cmd --permanent --add-port=8002/tcp # DeepWiki API
sudo firewall-cmd --reload
echo "Firewall configured successfully."

# Create project directory structure
echo "Creating directory structure..."
mkdir -p ~/codequal-deployment/nginx/conf.d
mkdir -p ~/codequal-deployment/nginx/ssl
mkdir -p ~/codequal-deployment/supabase-setup

# Clone repositories
echo "Cloning repositories..."
git clone https://github.com/your-username/codequal.git ~/codequal-deployment/codequal
git clone https://github.com/your-username/deepwiki-open.git ~/codequal-deployment/deepwiki

# Copy configuration files
echo "Copying configuration files..."
cp docker-compose.yml ~/codequal-deployment/
cp Dockerfile.codequal ~/codequal-deployment/codequal/Dockerfile
cp Dockerfile.deepwiki ~/codequal-deployment/deepwiki/Dockerfile
cp nginx.conf ~/codequal-deployment/nginx/conf.d/default.conf
cp init.sql ~/codequal-deployment/supabase-setup/

# Generate self-signed SSL certificate
echo "Generating SSL certificate..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ~/codequal-deployment/nginx/ssl/server.key \
  -out ~/codequal-deployment/nginx/ssl/server.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
sudo chmod 400 ~/codequal-deployment/nginx/ssl/server.key

# Update environment variables
echo "Please update the environment variables in docker-compose.yml with your API keys"
echo "Edit ~/codequal-deployment/docker-compose.yml to add:"
echo "- API_KEY_CLAUDE=your_api_key"
echo "- API_KEY_OPENAI=your_api_key"
echo "- API_KEY_DEEPSEEK=your_api_key"
echo "- API_KEY_GEMINI=your_api_key"
echo "- GITHUB_TOKEN=your_github_token"

echo "===== Setup completed successfully ====="
echo "To deploy the stack, navigate to ~/codequal-deployment and run:"
echo "docker-compose up -d"
