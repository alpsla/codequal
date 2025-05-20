# CodeQual Deployment Checklist

This checklist covers all the steps needed to deploy CodeQual and DeepWiki on Oracle Cloud once your VM is available.

## Pre-Deployment Preparation
- [ ] Gather all required API keys:
  - [ ] Claude API key
  - [ ] OpenAI API key
  - [ ] DeepSeek API key
  - [ ] Gemini API key
  - [ ] GitHub personal access token
- [ ] Update environment variables in `docker-compose.yml`
- [ ] Verify SSH private key is accessible (downloaded from Oracle Cloud)

## VM Setup
- [ ] Connect to instance:
  ```bash
  ssh -i /path/to/private_key opc@<vm-public-ip>
  ```
- [ ] Update system packages:
  ```bash
  sudo dnf update -y
  ```
- [ ] Create deployment directory:
  ```bash
  mkdir -p ~/codequal-deployment
  ```
- [ ] Copy all prepared files to VM:
  ```bash
  scp -i /path/to/private_key /path/to/local/files/* opc@<vm-public-ip>:~/codequal-deployment/
  ```

## Environment Configuration
- [ ] Run setup script:
  ```bash
  cd ~/codequal-deployment
  chmod +x setup.sh
  ./setup.sh
  ```
- [ ] Verify Docker installation:
  ```bash
  docker --version
  docker-compose --version
  ```
- [ ] Verify file permissions:
  ```bash
  chmod 600 ~/codequal-deployment/nginx/ssl/server.key
  ```

## Deployment
- [ ] Launch the services:
  ```bash
  cd ~/codequal-deployment
  docker-compose up -d
  ```
- [ ] Verify containers are running:
  ```bash
  docker-compose ps
  ```
- [ ] Check logs for any errors:
  ```bash
  docker-compose logs
  ```

## Testing
- [ ] Test CodeQual API:
  ```bash
  curl -k https://<vm-public-ip>/api/codequal/health
  ```
- [ ] Test DeepWiki API:
  ```bash
  curl -k https://<vm-public-ip>/api/deepwiki/health
  ```
- [ ] Verify database connectivity:
  ```bash
  docker exec -it codequal-supabase psql -U postgres -c "\l"
  ```

## Monitoring and Maintenance
- [ ] Set up log rotation:
  ```bash
  sudo tee /etc/logrotate.d/docker-containers > /dev/null <<EOT
  /var/lib/docker/containers/*/*.log {
      rotate 7
      daily
      compress
      size=50M
      missingok
      delaycompress
      copytruncate
  }
  EOT
  ```
- [ ] Create backup script:
  ```bash
  echo '#!/bin/bash' > ~/backup-db.sh
  echo 'docker exec codequal-supabase pg_dump -U postgres postgres > ~/backups/supabase_backup_$(date +%Y%m%d).sql' >> ~/backup-db.sh
  chmod +x ~/backup-db.sh
  ```

## Security Configuration
- [ ] Change default database password:
  ```bash
  # Update in docker-compose.yml and restart containers
  ```
- [ ] Configure SSL certificates (replace self-signed with Let's Encrypt if needed)
- [ ] Update firewall rules if needed:
  ```bash
  sudo firewall-cmd --permanent --add-port=<port>/tcp
  sudo firewall-cmd --reload
  ```

## Documentation
- [ ] Document environment details:
  - [ ] VM specifications 
  - [ ] Deployment architecture
  - [ ] API endpoints
  - [ ] Backup procedures
- [ ] Create user guide for accessing CodeQual
