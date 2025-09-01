# DigitalOcean Droplet Setup Guide for CodeQual

## 📋 Prerequisites

- DigitalOcean account (get $200 free credit: https://try.digitalocean.com/freetrialoffer/)
- SSH key pair generated on your local machine
- Credit card for account verification (won't be charged with free credits)

## 🚀 Quick Setup (5 minutes)

### Step 1: Generate SSH Key (if you don't have one)

```bash
# Check if you already have an SSH key
ls -la ~/.ssh/id_rsa.pub

# If not, generate one
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
# Press Enter for default location
# Press Enter twice for no passphrase (or set one if preferred)

# Display your public key
cat ~/.ssh/id_rsa.pub
```

### Step 2: Create Droplet via DigitalOcean Dashboard

1. **Login to DigitalOcean**: https://cloud.digitalocean.com/

2. **Click "Create" → "Droplets"**

3. **Choose Configuration:**
   - **Region**: Choose closest to you (e.g., New York, San Francisco)
   - **Image**: Ubuntu 22.04 LTS x64
   - **Size**: 
     - Minimum: Basic → Regular → $12/mo (2GB RAM, 1 CPU, 50GB SSD)
     - Recommended: Basic → Regular → $24/mo (4GB RAM, 2 CPUs, 80GB SSD)
   - **Authentication**: Select "SSH Keys"
     - Click "New SSH Key"
     - Paste your public key from Step 1
     - Name it (e.g., "CodeQual Testing")
   - **Hostname**: `codequal-security-tools`

4. **Click "Create Droplet"**

5. **Wait 30-60 seconds for creation**

6. **Copy the IP address** shown in your droplets list

### Step 3: Initial Droplet Setup

```bash
# Export your droplet IP
export DROPLET_IP=<your-droplet-ip>

# Test SSH connection
ssh root@$DROPLET_IP

# If successful, you'll see the Ubuntu prompt
# Type 'exit' to return to your local machine
```

## 🛠️ Automated Droplet Setup

I've created a script that handles everything automatically: