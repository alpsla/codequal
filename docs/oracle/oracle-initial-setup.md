# Oracle Cloud Initial Server Setup for CodeQual

This guide provides detailed instructions for the initial setup of your Oracle Cloud VM instance for the CodeQual and DeepWiki deployment. Follow these steps once your VM.Standard.A1.Flex instance is successfully provisioned.

## 1. Connect to Your Instance

After your Oracle Cloud VM is provisioned, you'll need to connect to it via SSH using the private key you downloaded during setup.

### For macOS and Linux Users

```bash
# Set proper permissions for your private key
chmod 400 /path/to/your/private_key.key

# Connect to your instance
ssh -i /path/to/your/private_key.key opc@<your-instance-public-ip>
```

### For Windows Users

If using Windows, you have several options:

**Option 1: Using Windows Subsystem for Linux (WSL)**
```bash
chmod 400 /path/to/your/private_key.key
ssh -i /path/to/your/private_key.key opc@<your-instance-public-ip>
```

**Option 2: Using PuTTY**
1. Convert your private key to PPK format using PuTTYgen
2. Open PuTTY and enter your instance's public IP
3. Go to Connection > SSH > Auth > Credentials and browse to your PPK file
4. Click "Open" to connect
5. Login as: opc

**Option 3: Using PowerShell**
```powershell
ssh -i C:\path\to\your\private_key.key opc@<your-instance-public-ip>
```

## 2. Update System Packages

Once connected, update the system packages:

```bash
# Update package lists
sudo dnf update -y

# Install basic utilities
sudo dnf install -y dnf-utils device-mapper-persistent-data lvm2 wget curl nano git htop
```

## 3. Configure the Firewall

Oracle Linux 8 uses `firewalld` for managing the firewall. Configure it to allow the necessary ports:

```bash
# Check firewall status
sudo systemctl status firewalld

# If not running, start and enable it
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Allow SSH (already should be allowed)
sudo firewall-cmd --permanent --add-service=ssh

# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Allow custom ports for CodeQual and DeepWiki APIs
sudo firewall-cmd --permanent --add-port=8001/tcp
sudo firewall-cmd --permanent --add-port=8002/tcp

# Allow database port (only needed if accessing DB from outside)
# sudo firewall-cmd --permanent --add-port=5432/tcp

# Reload firewall to apply changes
sudo firewall-cmd --reload

# Verify the settings
sudo firewall-cmd --list-all
```

## 4. Install Docker and Docker Compose

Docker and Docker Compose are essential for the CodeQual deployment:

```bash
# Set up Docker repository
sudo dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker packages
sudo dnf install -y docker-ce docker-ce-cli containerd.io

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group to run Docker without sudo
sudo usermod -aG docker $USER

# Verify Docker installation
docker version

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create a symbolic link
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify Docker Compose installation
docker-compose version
```

**Note**: After adding yourself to the docker group, you'll need to log out and log back in for the changes to take effect.

## 5. Install and Configure Nginx

Nginx will serve as a reverse proxy for the CodeQual and DeepWiki applications:

```bash
# Install Nginx
sudo dnf install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx
```

## 6. Configure Swap Space

Oracle Cloud ARM instances do not come with swap space by default. Adding swap space is recommended for better performance:

```bash
# Check if swap is already enabled
sudo swapon --show

# Create a swap file
sudo fallocate -l 8G /swapfile

# Set proper permissions
sudo chmod 600 /swapfile

# Set up swap area
sudo mkswap /swapfile

# Enable swap
sudo swapon /swapfile

# Make swap permanent by adding to fstab
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify swap is active
free -h
```

## 7. Set Up Directory Structure

Create the directory structure for your CodeQual deployment:

```bash
# Create main project directory
mkdir -p ~/codequal-deployment

# Create subdirectories
mkdir -p ~/codequal-deployment/nginx/conf.d
mkdir -p ~/codequal-deployment/nginx/ssl
mkdir -p ~/codequal-deployment/supabase-setup
mkdir -p ~/codequal-deployment/data
mkdir -p ~/codequal-deployment/backups
```

## 8. Configure System Optimizations

To optimize your Oracle Cloud VM for better performance:

```bash
# Create a sysctl config file for optimizations
sudo tee /etc/sysctl.d/99-codequal-optimizations.conf > /dev/null <<EOT
# Increase the maximum number of open files
fs.file-max = 100000

# Optimize network settings for better performance
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 10000 65535

# VM memory settings
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
EOT

# Apply sysctl settings
sudo sysctl --system

# Set up systemd resource limits for the user
sudo tee /etc/systemd/system/user-$(id -u).slice.d/override.conf > /dev/null <<EOT
[Slice]
CPUWeight=100
IOWeight=100
MemoryHigh=20G
TasksMax=infinity
EOT

# Reload systemd
sudo systemctl daemon-reload
```

## 9. Install Additional Development Tools

These additional tools will be helpful for development and debugging:

```bash
# Install development tools
sudo dnf groupinstall "Development Tools" -y

# Install Python 3 and pip
sudo dnf install -y python3 python3-pip python3-devel

# Install Node.js and npm (if not using Docker exclusively)
sudo dnf install -y nodejs npm

# Install database client for direct DB access if needed
sudo dnf install -y postgresql
```

## 10. Set Up Log Rotation

Configure log rotation to prevent logs from filling up your disk:

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

## 11. Configure Time Synchronization

Ensure your system time is accurate:

```bash
# Install chrony for time synchronization
sudo dnf install -y chrony

# Start and enable chronyd
sudo systemctl start chronyd
sudo systemctl enable chronyd

# Check time synchronization status
chronyc tracking
```

## 12. Generate SSL Certificate

Generate a self-signed SSL certificate for HTTPS:

```bash
# Generate a self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ~/codequal-deployment/nginx/ssl/server.key \
  -out ~/codequal-deployment/nginx/ssl/server.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-instance-ip"

# Set proper permissions
sudo chmod 400 ~/codequal-deployment/nginx/ssl/server.key
sudo chmod 444 ~/codequal-deployment/nginx/ssl/server.crt
```

## 13. Create a Non-Root User (Optional but Recommended)

It's a good security practice to run applications as a non-root user:

```bash
# Create a new user
sudo useradd -m -s /bin/bash codequal

# Add to necessary groups
sudo usermod -aG docker codequal

# Set a password
sudo passwd codequal

# Allow sudo access if needed
sudo usermod -aG wheel codequal

# Switch to the new user
su - codequal
```

## 14. Set Up Monitoring (Basic)

Basic system monitoring:

```bash
# Install basic monitoring tools
sudo dnf install -y sysstat iotop

# Enable system activity collection
sudo systemctl enable sysstat
sudo systemctl start sysstat

# Configure collection interval (every 10 minutes)
sudo sed -i 's/*/10 * * * */*:00-59/10 * * * */g' /etc/cron.d/sysstat
```

## 15. Create Bash Aliases for Common Tasks

Create helpful shortcuts for managing your deployment:

```bash
# Create aliases for the current user
cat >> ~/.bashrc << 'EOT'

# CodeQual aliases
alias cd-cq='cd ~/codequal-deployment'
alias cq-logs='docker-compose -f ~/codequal-deployment/docker-compose.yml logs -f'
alias cq-status='docker-compose -f ~/codequal-deployment/docker-compose.yml ps'
alias cq-restart='docker-compose -f ~/codequal-deployment/docker-compose.yml restart'
alias cq-stop='docker-compose -f ~/codequal-deployment/docker-compose.yml stop'
alias cq-start='docker-compose -f ~/codequal-deployment/docker-compose.yml start'
alias cq-update='cd ~/codequal-deployment && git pull && docker-compose up -d --build'
alias cq-backup='docker exec codequal-supabase pg_dump -U postgres postgres > ~/codequal-deployment/backups/supabase_backup_$(date +%Y%m%d).sql'
EOT

# Apply changes immediately
source ~/.bashrc
```

## 16. Set Up Basic System Monitoring

Install a lightweight system monitoring tool:

```bash
# Install Glances
sudo pip3 install glances

# Start Glances web server (optionally, add to systemd for persistence)
glances -w &
```

You can now access Glances at `http://<your-instance-ip>:61208/`

## 17. First Time System Check

Perform a comprehensive system check:

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU information
lscpu

# Check network configuration
ip addr show

# Check OS information
cat /etc/os-release

# Check running services
systemctl list-units --type=service --state=running

# Check Docker status
docker info

# Check Docker available storage
docker system df
```

## 18. Secure SSH Configuration (Optional)

For enhanced security, consider hardening SSH:

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Changes to consider:
# PermitRootLogin no
# PasswordAuthentication no
# X11Forwarding no
# MaxAuthTries 3
# MaxSessions 5

# After changes, restart SSH
sudo systemctl restart sshd
```

## 19. Set Up Automatic Updates (Optional)

Configure automatic security updates:

```bash
# Install dnf-automatic
sudo dnf install -y dnf-automatic

# Configure automatic updates
sudo sed -i 's/apply_updates = no/apply_updates = yes/g' /etc/dnf/automatic.conf

# Enable and start the service
sudo systemctl enable --now dnf-automatic.timer

# Check timer status
sudo systemctl status dnf-automatic.timer
```

## 20. Check for SELinux Conflicts

Oracle Linux has SELinux enabled by default, which might interfere with some containers:

```bash
# Check SELinux status
getenforce

# If it's in Enforcing mode, you have two options:
# Option 1: Set SELinux to permissive mode temporarily
sudo setenforce 0

# Option 2: Configure SELinux to allow Docker properly (recommended for production)
sudo dnf install -y container-selinux selinux-policy-base
sudo semanage port -a -t http_port_t -p tcp 8001
sudo semanage port -a -t http_port_t -p tcp 8002
```

## Next Steps

After completing this initial server setup, you're ready to deploy the CodeQual and DeepWiki applications following the main deployment guide. The server is now properly configured with all the necessary dependencies and security settings.

To proceed with the deployment:

1. Clone the repositories
2. Configure Docker Compose
3. Set up the database
4. Deploy and start the services

These steps are covered in detail in the main CodeQual and DeepWiki Deployment Guide.
