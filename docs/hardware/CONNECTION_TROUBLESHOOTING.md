# Connection Troubleshooting Guide

## Instance Details
- **Instance Name**: codequal-v9-docker
- **Public IP**: 129.213.49.128
- **OS**: Oracle Linux 9.6
- **Default User**: opc

## SSH Connection Issues

### Issue: Permission denied (publickey)

This usually means the SSH key doesn't match what was configured when creating the instance.

### Solution Options:

#### Option 1: Check which SSH key was used
When you created the instance via the OCI Console, you either:
1. Generated a new SSH key pair (downloaded a .key file)
2. Uploaded an existing public key
3. Pasted a public key

**To connect, you need to use the matching private key.**

#### Option 2: If you generated a new key in the console
```bash
# The downloaded file might be named something like:
# - ssh-key-2025-09-27.key
# - codequal-v9-docker.key

# Find downloaded key files:
ls ~/Downloads/*.key

# Use it to connect:
chmod 600 ~/Downloads/[your-key-file].key
ssh -i ~/Downloads/[your-key-file].key opc@129.213.49.128
```

#### Option 3: If you used an existing key
Check your SSH keys:
```bash
ls -la ~/.ssh/

# Try common key names:
ssh -i ~/.ssh/id_rsa opc@129.213.49.128
ssh -i ~/.ssh/id_ed25519 opc@129.213.49.128
```

#### Option 4: Add/Update SSH key via OCI Console

1. Go to OCI Console
2. Navigate to Compute → Instances
3. Click on "codequal-v9-docker"
4. Stop the instance (Actions → Stop)
5. Once stopped, click "Edit"
6. In SSH keys section, add your public key:
   ```bash
   cat ~/.ssh/oci_codequal_rsa.pub
   ```
7. Save and Start the instance

#### Option 5: Use OCI Cloud Shell

1. In OCI Console, click the Cloud Shell icon (top right)
2. Upload the setup script to Cloud Shell
3. Connect from Cloud Shell:
   ```bash
   ssh opc@129.213.49.128
   ```

## Once Connected

After successfully connecting, run these commands:

```bash
# 1. Download the setup script directly
curl -O https://raw.githubusercontent.com/[your-repo]/docs/hardware/setup-instance-ol9.sh
# OR copy the contents manually

# 2. Make executable and run
chmod +x setup-instance-ol9.sh
./setup-instance-ol9.sh

# 3. Configure Docker (after setup completes)
newgrp docker
docker login registry.digitalocean.com
```

## Quick Setup Alternative

If you can't copy the script, run these essential commands directly on the instance:

```bash
# Update system
sudo dnf update -y

# Install Docker
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker opc

# Setup workspace
sudo mkdir -p /mnt/workspace/{repos,output,cache}
sudo chown -R opc:opc /mnt/workspace

# Apply Docker permissions
newgrp docker

# Test Docker
docker run hello-world
```

## Verify Connection

Once connected, verify the system:

```bash
# Check OS
cat /etc/oracle-release

# Check resources
lscpu | grep "CPU(s):"
free -h

# Check Docker
docker --version
```

## Need Help?

1. **Check instance logs**: In OCI Console → Instance Details → Console Connection
2. **Reset SSH keys**: Stop instance → Edit → Update SSH keys → Start
3. **Use Serial Console**: Instance Details → Console Connection → Create Serial Console Connection