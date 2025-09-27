# Oracle Cloud Infrastructure - CodeQual V9 Instance

## ✅ Current Status: Instance Running

We have successfully deployed an Oracle A1.Flex instance optimized for parallel code analysis.

## 🚀 Quick Connect

```bash
ssh -i ~/.ssh/oci_codequal_rsa opc@129.213.49.128
```

## 📊 Instance Details

| Property | Value |
|----------|-------|
| **Public IP** | `129.213.49.128` |
| **Instance Name** | `codequal-v9-docker` |
| **Instance ID** | `ocid1.instance.oc1.iad.anuwcljtdsmxo3qcn5ct6kyvely5uojljeozcicljvgv4rootpp6dluqax5q` |
| **Shape** | VM.Standard.A1.Flex |
| **OCPUs** | 4 ARM cores |
| **Memory** | 24 GB RAM |
| **Storage** | 200 GB boot volume |
| **OS** | Oracle Linux 9.6 (ARM64) |
| **Region** | us-ashburn-1 |

## 📁 Repository Structure

```
docs/hardware/
├── README.md                    # This file - overview and quick start
├── INSTANCE_CONNECTION.md       # Detailed connection and management commands
├── setup-instance-ol9.sh        # Automated setup script for Oracle Linux 9
├── docker-compose.yml           # Docker orchestration with CPU pinning
├── run-parallel-analysis.sh    # Analysis execution and monitoring script
└── archive/                     # Historical scripts and documentation
```

## 🛠️ Setup Instructions

### Initial Setup (One-time)

1. **Copy setup script to instance:**
   ```bash
   scp -i ~/.ssh/oci_codequal_rsa docs/hardware/setup-instance-ol9.sh opc@129.213.49.128:~/
   ```

2. **Connect and run setup:**
   ```bash
   ssh -i ~/.ssh/oci_codequal_rsa opc@129.213.49.128
   chmod +x setup-instance-ol9.sh
   ./setup-instance-ol9.sh
   ```

3. **Configure Docker Registry:**
   ```bash
   docker login registry.digitalocean.com
   # Username: Your DigitalOcean email
   # Password: Your DigitalOcean API token
   ```

4. **Pull analyzer images:**
   ```bash
   docker pull registry.digitalocean.com/codequal/analyzer:lang-java-v5.1
   docker pull registry.digitalocean.com/codequal/analyzer:lang-python-v4.3
   docker pull registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3
   docker pull registry.digitalocean.com/codequal/analyzer:security-v4.2
   ```

## 🔬 Running Analysis

### Quick Test
```bash
# Small repository for testing
/mnt/workspace/run-analysis.sh https://github.com/redis/redis unstable
```

### Production Analysis
```bash
# Large repository (Apache Kafka)
/mnt/workspace/run-analysis.sh https://github.com/apache/kafka trunk
```

### Monitor Progress
```bash
# Watch containers
docker stats

# Check specific analyzer
docker logs analyzer-java -f
```

## ⚡ Performance Improvements

### Previous Setup (DigitalOcean)
- ❌ Sequential execution only
- ❌ 45+ minutes per tool
- ❌ Shared resources with contention
- ❌ Network storage bottlenecks

### Current Setup (Oracle A1.Flex)
- ✅ **4 parallel analyzers** with dedicated CPU cores
- ✅ **75% faster** - 10-20 minutes total
- ✅ **CPU pinning** - No resource contention
- ✅ **Local NVMe** - Fast I/O operations
- ✅ **8GB tmpfs** - In-memory repository cache

## 💰 Cost Optimization

| Timeframe | Cost | Notes |
|-----------|------|-------|
| Hourly | $0.04 | 4 OCPUs × $0.01/hour |
| Daily | ~$1.00 | 24-hour operation |
| Monthly | ~$30 | Continuous operation |

### Cost Saving Commands
```bash
# Stop instance when not in use
oci compute instance action --action STOP --instance-id ocid1.instance.oc1.iad.anuwcljtdsmxo3qcn5ct6kyvely5uojljeozcicljvgv4rootpp6dluqax5q

# Start when needed
oci compute instance action --action START --instance-id ocid1.instance.oc1.iad.anuwcljtdsmxo3qcn5ct6kyvely5uojljeozcicljvgv4rootpp6dluqax5q
```

## 🏗️ Architecture

```
Oracle A1.Flex Instance
├── CPU Core 0: analyzer-java (5GB RAM limit)
├── CPU Core 1: analyzer-python (5GB RAM limit)
├── CPU Core 2: analyzer-javascript (5GB RAM limit)
└── CPU Core 3: analyzer-security (5GB RAM limit)

Filesystem Layout:
/mnt/workspace/
├── repos/      # Repository cache (tmpfs - 8GB RAM disk)
├── output/     # Analysis results per analyzer
│   ├── java/
│   ├── python/
│   ├── javascript/
│   └── security/
├── cache/      # Shared cache directory
└── logs/       # Application logs
```

## 🔧 Troubleshooting

For detailed troubleshooting, see [INSTANCE_CONNECTION.md](./INSTANCE_CONNECTION.md)

### Common Issues

**Cannot connect via SSH:**
```bash
# Check instance status
oci compute instance get --instance-id ocid1.instance.oc1.iad.anuwcljtdsmxo3qcn5ct6kyvely5uojljeozcicljvgv4rootpp6dluqax5q --query 'data."lifecycle-state"'

# Verify SSH key permissions
chmod 600 ~/.ssh/oci_codequal_rsa
```

**Docker permission denied:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

**Out of memory:**
```bash
# Check memory usage
free -h
docker stats

# Adjust limits in /mnt/workspace/docker-compose.yml
```

## 📞 Support

- **Oracle Cloud Support**: 1-800-633-0738
- **Instance Management**: See [INSTANCE_CONNECTION.md](./INSTANCE_CONNECTION.md)
- **Container Logs**: `docker logs <container-name>`

## 🔄 Migration Notes

This setup replaces our previous DigitalOcean infrastructure with significant improvements:
- Moved from sequential to parallel execution
- Reduced analysis time by 75%
- Eliminated shared filesystem bottlenecks
- Achieved predictable performance with CPU pinning

