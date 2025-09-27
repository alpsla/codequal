#!/usr/bin/env python3
"""
OCI A1.Flex Instance Hunter
Automatically attempts to create A1.Flex instances across multiple regions
Optimized for CodeQual V9 parallel execution requirements
"""

import subprocess
import json
import time
import random
from datetime import datetime
from typing import Dict, List, Optional

class OCIA1FlexHunter:
    def __init__(self):
        # Only subscribed region (user only has us-ashburn-1 active)
        self.regions = [
            'us-ashburn-1',    # Only subscribed region
        ]
        
        # A1.Flex configurations for CodeQual V9 - multiple options for better hunt success
        self.instance_configs = [
            {'shape': 'VM.Standard.A1.Flex', 'ocpus': 4.1, 'memory_gb': 24, 'boot_volume_gb': 200, 'priority': 1},  # Optimal
            {'shape': 'VM.Standard.A1.Flex', 'ocpus': 4, 'memory_gb': 24, 'boot_volume_gb': 200, 'priority': 2},    # Fallback
            {'shape': 'VM.Standard.A1.Flex', 'ocpus': 2, 'memory_gb': 12, 'boot_volume_gb': 100, 'priority': 3},    # Minimal
        ]
        
        # Multiple OS options to increase success rate
        self.os_options = [
            {'os': 'Canonical Ubuntu', 'version': '22.04', 'priority': 1},
            {'os': 'Canonical Ubuntu', 'version': '24.04', 'priority': 2},
            {'os': 'Oracle Linux', 'version': '8', 'priority': 3},
            {'os': 'Oracle Linux', 'version': '9', 'priority': 4},
        ]
        
        # Success tracking
        self.attempts = 0
        self.region_attempts = {region: 0 for region in self.regions}
        self.ad_attempts = {}
        self.config_attempts = {}
        
    def log(self, message: str):
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def get_compartment_id(self) -> str:
        """Get the root compartment ID"""
        try:
            result = subprocess.run([
                'oci', 'iam', 'compartment', 'list',
                '--compartment-id-in-subtree', 'true',
                '--query', 'data[?name==`root`] | [0].id',
                '--raw-output'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
            else:
                # Fallback: get user's tenancy as compartment
                result = subprocess.run([
                    'oci', 'iam', 'user', 'get',
                    '--user-id', '$(oci iam user list --query "data[0].id" --raw-output)',
                    '--query', 'data."compartment-id"',
                    '--raw-output'
                ], capture_output=True, text=True, shell=True, timeout=30)
                return result.stdout.strip()
                
        except Exception as e:
            self.log(f"Error getting compartment ID: {e}")
            # Return known tenancy ID from your auth
            return "ocid1.tenancy.oc1..aaaaaaaaphbe3h3pzvami57wiaxlkxwecu7beyeijrynfcr6w24ixn6u7k4a"
    
    def get_availability_domains(self, region: str) -> List[str]:
        """Get ALL availability domains for region"""
        try:
            result = subprocess.run([
                'oci', 'iam', 'availability-domain', 'list',
                '--region', region,
                '--query', 'data[*].name',
                '--raw-output'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and result.stdout.strip():
                import json
                ads = json.loads(result.stdout)
                self.log(f"Debug: Found {len(ads)} ADs for {region}: {ads}")
                return ads
            return []
            
        except Exception as e:
            self.log(f"Error getting ADs for {region}: {e}")
            return []
    
    def get_os_image(self, region: str, compartment_id: str, os_name: str, os_version: str) -> Optional[str]:
        """Get latest ARM image for specified OS and version"""
        try:
            result = subprocess.run([
                'oci', 'compute', 'image', 'list',
                '--region', region,
                '--compartment-id', compartment_id,
                '--operating-system', os_name,
                '--operating-system-version', os_version,
                '--shape', 'VM.Standard.A1.Flex',
                '--sort-by', 'TIMECREATED',
                '--sort-order', 'DESC',
                '--query', 'data[0].id',
                '--raw-output'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and result.stdout.strip():
                image_id = result.stdout.strip()
                self.log(f"Debug: Found {os_name} {os_version} image: {image_id}")
                return image_id
            else:
                self.log(f"Debug: No {os_name} {os_version} image found in {region}")
            return None
            
        except Exception as e:
            self.log(f"Error getting {os_name} {os_version} image for {region}: {e}")
            return None
    
    def create_a1_instance(self, region: str, ad: str, config: dict, os_option: dict, image_id: str) -> bool:
        """Attempt to create A1.Flex instance with specific configuration"""
        self.attempts += 1
        self.region_attempts[region] += 1
        
        config_key = f"{config['ocpus']}cpu-{config['memory_gb']}gb"
        os_key = f"{os_option['os']}-{os_option['version']}"
        ad_short = ad.split('-')[-1] if '-' in ad else ad
        
        if ad not in self.ad_attempts:
            self.ad_attempts[ad] = 0
        if config_key not in self.config_attempts:
            self.config_attempts[config_key] = 0
            
        self.ad_attempts[ad] += 1
        self.config_attempts[config_key] += 1
        
        self.log(f"🎯 Attempt #{self.attempts} - {region}/{ad_short}: {config['ocpus']}cpu+{config['memory_gb']}gb, {os_key}")
        
        try:
            compartment_id = self.get_compartment_id()
            
            # Get subnet ID (hardcoded for us-ashburn-1, only subscribed region)
            subnet_id = None
            if region == 'us-ashburn-1':
                subnet_id = "ocid1.subnet.oc1.iad.aaaaaaaambo47na3prh7dxdwdt3tvg7tii3mnjfjjz4g5kmkkcgnelgzli4a"
            
            if not all([compartment_id, image_id, subnet_id]):
                self.log(f"❌ Missing resources: compartment={bool(compartment_id)}, image={bool(image_id)}, subnet={bool(subnet_id)}")
                return False
            
            # Generate unique instance name
            timestamp = datetime.now().strftime("%m%d-%H%M%S")
            instance_name = f"cq-v9-{config['ocpus']}c-{ad_short}-{timestamp}"
            
            # Create instance command
            cmd = [
                'oci', 'compute', 'instance', 'launch',
                '--region', region,
                '--compartment-id', compartment_id,
                '--availability-domain', ad,
                '--image-id', image_id,
                '--shape', config['shape'],
                '--shape-config', json.dumps({
                    'ocpus': config['ocpus'],
                    'memoryInGBs': config['memory_gb']
                }),
                '--display-name', instance_name,
                '--boot-volume-size-in-gbs', str(config['boot_volume_gb']),
                '--subnet-id', subnet_id,
                '--wait-for-state', 'RUNNING',
                '--max-wait-seconds', '300'
            ]
            
            self.log(f"🚀 Launching: {instance_name}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=400)
            
            if result.returncode == 0:
                self.log(f"🎉 SUCCESS! A1.Flex instance created!")
                self.log(f"Instance: {instance_name}")
                self.log(f"Config: {config['ocpus']} OCPUs, {config['memory_gb']}GB RAM")
                self.log(f"AD: {ad}")
                self.log(f"OS: {os_key}")
                
                # Try to get instance details
                try:
                    instance_data = json.loads(result.stdout)
                    public_ip = instance_data.get('data', {}).get('primary-public-ip', 'Unknown')
                    instance_id = instance_data.get('data', {}).get('id', 'Unknown')
                    self.log(f"Public IP: {public_ip}")
                    self.log(f"Instance ID: {instance_id}")
                except:
                    pass
                
                return True
                
            else:
                error_msg = result.stderr.strip()
                if "Out of host capacity" in error_msg or "500-InternalError" in error_msg:
                    self.log(f"⏳ No capacity: {config_key} in {ad_short}")
                elif "LimitExceeded" in error_msg:
                    self.log(f"⚠️  Limit exceeded: {config_key}")
                elif "InvalidParameter" in error_msg:
                    self.log(f"❌ Invalid config: {config_key} with {os_key}")
                else:
                    self.log(f"❌ Error: {error_msg[:100]}...")
                return False
                
        except subprocess.TimeoutExpired:
            self.log(f"⏰ Timeout: {config_key} in {ad_short}")
            return False
        except Exception as e:
            self.log(f"💥 Exception: {e}")
            return False
    
    def hunt(self, max_attempts: int = 2000, delay_range: tuple = (15, 45)) -> bool:
        """Enhanced hunting with multiple ADs, configs, and OS options"""
        self.log("🏹 Enhanced A1.Flex hunting for CodeQual V9...")
        self.log(f"Configs: {len(self.instance_configs)} CPU/RAM options")
        self.log(f"OS Options: {len(self.os_options)} different images")
        self.log(f"Target regions: {', '.join(self.regions)}")
        self.log(f"Max attempts: {max_attempts}, Delay: {delay_range[0]}-{delay_range[1]} seconds")
        
        start_time = time.time()
        
        # Pre-fetch resources for all combinations
        self.log("🔍 Pre-fetching available resources...")
        available_combinations = []
        
        for region in self.regions:
            compartment_id = self.get_compartment_id()
            ads = self.get_availability_domains(region)
            
            for ad in ads:
                for config in self.instance_configs:
                    for os_option in self.os_options:
                        image_id = self.get_os_image(region, compartment_id, os_option['os'], os_option['version'])
                        if image_id:
                            available_combinations.append({
                                'region': region,
                                'ad': ad,
                                'config': config,
                                'os_option': os_option,
                                'image_id': image_id,
                                'priority': config['priority'] + os_option['priority']
                            })
        
        # Sort by priority (lower number = higher priority)
        available_combinations.sort(key=lambda x: x['priority'])
        
        self.log(f"📊 Found {len(available_combinations)} valid combinations to try")
        if not available_combinations:
            self.log("❌ No valid combinations found - check region subscriptions and resources")
            return False
        
        # Show breakdown
        ad_count = len(set(combo['ad'] for combo in available_combinations))
        config_count = len(set(f"{combo['config']['ocpus']}cpu" for combo in available_combinations))
        os_count = len(set(f"{combo['os_option']['os']}-{combo['os_option']['version']}" for combo in available_combinations))
        
        self.log(f"📈 Combinations: {ad_count} ADs × {config_count} configs × {os_count} OS images")
        
        try:
            combination_index = 0
            
            for attempt in range(max_attempts):
                # Cycle through combinations with some randomization
                if random.random() < 0.7:  # 70% structured, 30% random
                    combo = available_combinations[combination_index % len(available_combinations)]
                    combination_index += 1
                else:
                    combo = random.choice(available_combinations)
                
                if self.create_a1_instance(
                    combo['region'], 
                    combo['ad'], 
                    combo['config'], 
                    combo['os_option'], 
                    combo['image_id']
                ):
                    elapsed = time.time() - start_time
                    self.log(f"🎊 VICTORY! Instance created after {self.attempts} attempts in {elapsed/60:.1f} minutes")
                    self._print_success_stats()
                    return True
                
                # Dynamic delay based on time of day
                current_hour = datetime.now().hour
                if 23 <= current_hour or current_hour <= 3:  # Optimal hours
                    delay = random.randint(delay_range[0], delay_range[0] + 20)
                else:
                    delay = random.randint(delay_range[0], delay_range[1])
                
                # Show progress every 50 attempts
                if self.attempts % 50 == 0:
                    elapsed = time.time() - start_time
                    rate = self.attempts / elapsed * 60  # attempts per minute
                    self.log(f"📊 Progress: {self.attempts} attempts in {elapsed/60:.1f}min ({rate:.1f}/min)")
                    self._print_attempt_stats()
                
                self.log(f"😴 Sleeping {delay}s...")
                time.sleep(delay)
                
        except KeyboardInterrupt:
            elapsed = time.time() - start_time
            self.log(f"\n🛑 Hunting stopped by user after {self.attempts} attempts in {elapsed/60:.1f} minutes")
            self._print_attempt_stats()
            return False
        
        elapsed = time.time() - start_time
        self.log(f"😞 Hunting completed after {max_attempts} attempts in {elapsed/60:.1f} minutes")
        self._print_attempt_stats()
        return False
    
    def _print_attempt_stats(self):
        """Print detailed attempt statistics"""
        self.log("📈 Attempt Statistics:")
        self.log(f"  Regions: {dict(self.region_attempts)}")
        if self.ad_attempts:
            ad_summary = {ad.split('-')[-1]: count for ad, count in self.ad_attempts.items()}
            self.log(f"  ADs: {ad_summary}")
        if self.config_attempts:
            self.log(f"  Configs: {dict(self.config_attempts)}")
    
    def _print_success_stats(self):
        """Print success statistics"""
        self.log("🎉 Success achieved with enhanced hunting strategy!")
        self._print_attempt_stats()

def main():
    hunter = OCIA1FlexHunter()
    
    print("🎯 Enhanced CodeQual V9 Oracle A1.Flex Hunter")
    print("===============================================")
    print("🚀 Enhanced Features:")
    print("   • Multiple OCPUs: 4.1, 4.0, 2.0 (prioritized)")
    print("   • All Availability Domains: AD-1, AD-2, AD-3")
    print("   • Multiple OS Images: Ubuntu 22.04/24.04, Oracle Linux 8/9")
    print("   • Faster hunting: 15-45s delays, 2000 attempts")
    print("   • Smart combinations: Pre-fetched and prioritized")
    print()
    print("Press Ctrl+C at any time to stop")
    print()
    
    # Start enhanced hunting
    success = hunter.hunt(max_attempts=2000, delay_range=(15, 45))
    
    if success:
        print("\n🎉 SUCCESS! Your A1.Flex instance is ready for CodeQual V9!")
        print("\n🔧 Next steps:")
        print("1. SSH into your instance (check output above for IP)")
        print("2. Install Docker and Kubernetes (kubeadm/k3s)")
        print("3. Deploy CodeQual V9 with parallel execution enabled")
        print("4. Configure 4+ OCPUs for parallel tool execution")
    else:
        print("\n💡 Alternative options:")
        print("1. Try again during optimal hours (11 PM - 3 AM EST)")
        print("2. Upgrade to paid account for guaranteed capacity (~$7/month)")
        print("3. Consider other cloud providers (GCP, AWS free tiers)")

if __name__ == "__main__":
    main()