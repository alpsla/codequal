# Oracle A1.Flex Instance - Connection Information

## Current Instance Details

**Instance Created**: September 27, 2025
**Status**: ✅ RUNNING

### Instance Specifications
- **Name**: `codequal-v9-docker`
- **Instance ID**: `ocid1.instance.oc1.iad.anuwcljtdsmxo3qcn5ct6kyvely5uojljeozcicljvgv4rootpp6dluqax5q`
- **Public IP**: `129.213.49.128`
- **Private IP**: `10.0.0.239`
- **Shape**: VM.Standard.A1.Flex
- **OCPUs**: 4 cores (ARM Ampere A1)
- **Memory**: 24 GB RAM
- **Boot Volume**: 200 GB
- **Region**: us-ashburn-1 (US East)
- **OS**: Oracle Linux 9 (ARM/aarch64)

## How to Connect

### SSH Connection
```bash
ssh -i ~/.ssh/oci_codequal_rsa opc@129.213.49.128
```

### First Time Setup
If you haven't connected yet, run these commands from your local machine:

1. **Copy setup script to instance:**
```bash
scp -i ~/.ssh/oci_codequal_rsa ~/Code\ Prjects/codequal/docs/hardware/setup-instance-ol9.sh opc@129.213.49.128:~/
```

2. **Connect and run setup:**
```bash
ssh -i ~/.ssh/oci_codequal_rsa opc@129.213.49.128
chmod +x setup-instance-ol9.sh
./setup-instance-ol9.sh
```

## Quick Commands

### Check Instance Status (from local)
```bash
export SUPPRESS_LABEL_WARNING=True
oci compute instance get --instance-id ocid1.instance.oc1.iad.anuwcljtdsmxo3qcn5ct6kyvely5uojljeozcicljvgv4rootpp6dluqax5q --query 'data.{Name:"display-name", State:"lifecycle-state", Shape:shape}' --output table
```

### Start/Stop Instance (from local)
```bash
# Stop
oci compute instance action --action STOP --instance-id ocid1.instance.oc1.iad.anuwcljtdsmxo3qcn5ct6kyvely5uojljeozcicljvgv4rootpp6dluqax5q

# Start
oci compute instance action --action START --instance-id ocid1.instance.oc1.iad.anuwcljtdsmxo3qcn5ct6kyvely5uojljeozcicljvgv4rootpp6dluqax5q
```

### Monitor Resources (on instance)
```bash
# CPU and Memory
htop

# Disk usage
df -h

# Docker containers
docker stats

# Network
iftop
```

## Docker Registry Configuration

After connecting to the instance, configure Docker to access your registry:

```bash
# Login to DigitalOcean registry
docker login registry.digitalocean.com
# Username: Your DO email
# Password: Your DO API token

# Pull analyzer images
docker pull registry.digitalocean.com/codequal/analyzer:lang-java-v5.1
docker pull registry.digitalocean.com/codequal/analyzer:lang-python-v4.3
docker pull registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3
docker pull registry.digitalocean.com/codequal/analyzer:security-v4.2
```

## Running Analysis

Once setup is complete, run analysis on any repository:

```bash
# Test with small repo
/mnt/workspace/run-analysis.sh https://github.com/redis/redis unstable

# Production test
/mnt/workspace/run-analysis.sh https://github.com/apache/kafka trunk
```

## Troubleshooting

### Can't connect via SSH
1. Check instance is running: `oci compute instance get --instance-id <id>`
2. Verify security list allows port 22
3. Check SSH key permissions: `chmod 600 ~/.ssh/oci_codequal_rsa`

### Docker permission denied
Run: `sudo usermod -aG docker $USER` then logout and login again, or run `newgrp docker`

### Out of memory
Check memory usage: `free -h`
Reduce container memory limits in `/mnt/workspace/docker-compose.yml`

## Cost Management

- **Hourly Cost**: ~$0.04 (4 OCPUs × $0.01/hour)
- **Monthly Cost**: ~$30 for 24/7 operation
- **Stop when not in use** to save costs
- Instance storage persists when stopped

## Important Files on Instance

- `/mnt/workspace/docker-compose.yml` - Docker orchestration config
- `/mnt/workspace/run-analysis.sh` - Analysis runner script
- `/mnt/workspace/repos/` - Repository cache (tmpfs - cleared on reboot)
- `/mnt/workspace/output/` - Analysis results
- `/etc/docker/daemon.json` - Docker configuration