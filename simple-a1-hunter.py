#!/usr/bin/env python3
"""
Simple but Effective A1.Flex Hunter
Focuses on known working configurations with multiple ADs and CPU options
"""

import subprocess
import json
import time
import random
from datetime import datetime
from typing import List

class SimpleA1Hunter:
    def __init__(self):
        # Known working configurations for us-ashburn-1
        self.region = 'us-ashburn-1'
        self.compartment_id = "ocid1.tenancy.oc1..aaaaaaaaphbe3h3pzvami57wiaxlkxwecu7beyeijrynfcr6w24ixn6u7k4a"
        self.subnet_id = "ocid1.subnet.oc1.iad.aaaaaaaambo47na3prh7dxdwdt3tvg7tii3mnjfjjz4g5kmkkcgnelgzli4a"
        
        # Multiple ADs to try
        self.ads = [
            "SEsF:US-ASHBURN-AD-1",
            "SEsF:US-ASHBURN-AD-2", 
            "SEsF:US-ASHBURN-AD-3"
        ]
        
        # Multiple configurations (prioritized) - using whole numbers for better compatibility
        self.configs = [
            {
                'name': '4cpu-24gb-200gb',
                'ocpus': 4,
                'memory_gb': 24,
                'boot_gb': 200,
                'image_id': 'ocid1.image.oc1.iad.aaaaaaaa2qup33kak66ll3loslunng52zk5haq4pggre5gg7y3snr5wh55rq',  # Ubuntu 22.04
                'priority': 1
            },
            {
                'name': '2cpu-12gb-100gb',
                'ocpus': 2,
                'memory_gb': 12,
                'boot_gb': 100,
                'image_id': 'ocid1.image.oc1.iad.aaaaaaaa2qup33kak66ll3loslunng52zk5haq4pggre5gg7y3snr5wh55rq',  # Ubuntu 22.04
                'priority': 2
            },
            {
                'name': '1cpu-6gb-50gb',
                'ocpus': 1,
                'memory_gb': 6,
                'boot_gb': 50,
                'image_id': 'ocid1.image.oc1.iad.aaaaaaaa2qup33kak66ll3loslunng52zk5haq4pggre5gg7y3snr5wh55rq',  # Ubuntu 22.04
                'priority': 3
            },
            # Oracle Linux alternatives
            {
                'name': '4cpu-24gb-ol8',
                'ocpus': 4,
                'memory_gb': 24,
                'boot_gb': 200,
                'image_id': 'ocid1.image.oc1.iad.aaaaaaaawcdovhk474grs44ayolo6c5ut3ve6qwvbbyjdcaadgkvnjmsaoaa',  # Oracle Linux 8
                'priority': 4
            }
        ]
        
        # Create all combinations
        self.combinations = []
        for ad in self.ads:
            for config in self.configs:
                self.combinations.append({
                    'ad': ad,
                    'config': config,
                    'priority': config['priority']
                })
        
        # Sort by priority
        self.combinations.sort(key=lambda x: x['priority'])
        
        # Stats
        self.attempts = 0
        self.ad_stats = {ad: 0 for ad in self.ads}
        self.config_stats = {config['name']: 0 for config in self.configs}

    def log(self, message: str):
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")

    def try_create_instance(self, combo) -> bool:
        """Try to create instance with given combination"""
        self.attempts += 1
        ad = combo['ad']
        config = combo['config']
        
        ad_short = ad.split('-')[-1]  # AD-1, AD-2, AD-3
        
        # Update stats
        self.ad_stats[ad] += 1
        self.config_stats[config['name']] += 1
        
        self.log(f"🎯 #{self.attempts}: {ad_short} + {config['name']} ({config['ocpus']}cpu)")
        
        # Generate unique name
        timestamp = datetime.now().strftime("%m%d-%H%M%S")
        instance_name = f"cq-v9-{config['ocpus']}c-{ad_short}-{timestamp}"
        
        try:
            cmd = [
                'oci', 'compute', 'instance', 'launch',
                '--region', self.region,
                '--compartment-id', self.compartment_id,
                '--availability-domain', ad,
                '--image-id', config['image_id'],
                '--shape', 'VM.Standard.A1.Flex',
                '--shape-config', json.dumps({
                    'ocpus': config['ocpus'],
                    'memoryInGBs': config['memory_gb']
                }),
                '--display-name', instance_name,
                '--boot-volume-size-in-gbs', str(config['boot_gb']),
                '--subnet-id', self.subnet_id,
                '--wait-for-state', 'RUNNING',
                '--max-wait-seconds', '300'
            ]
            
            self.log(f"🚀 Launching {instance_name}...")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=350)
            
            if result.returncode == 0:
                self.log(f"🎉 SUCCESS! A1.Flex instance created!")
                self.log(f"✅ Instance: {instance_name}")
                self.log(f"✅ Config: {config['ocpus']} OCPUs, {config['memory_gb']}GB RAM")
                self.log(f"✅ AD: {ad_short}")
                
                # Try to get public IP
                try:
                    instance_data = json.loads(result.stdout)
                    public_ip = instance_data.get('data', {}).get('primary-public-ip', 'Pending')
                    instance_id = instance_data.get('data', {}).get('id', 'Unknown')
                    self.log(f"✅ Public IP: {public_ip}")
                    self.log(f"✅ Instance ID: {instance_id}")
                except Exception as e:
                    self.log(f"⚠️  Could not parse instance details: {e}")
                
                return True
                
            else:
                error = result.stderr.strip()
                if "Out of host capacity" in error:
                    self.log(f"⏳ No capacity in {ad_short} for {config['name']}")
                elif "LimitExceeded" in error:
                    self.log(f"⚠️  Free tier limit reached")
                    return False  # Stop trying if limit reached
                else:
                    self.log(f"❌ {error[:80]}...")
                
                return False
                
        except subprocess.TimeoutExpired:
            self.log(f"⏰ Timeout for {config['name']} in {ad_short}")
            return False
        except Exception as e:
            self.log(f"💥 Exception: {e}")
            return False

    def hunt(self, max_attempts: int = 1000, delay_range: tuple = (10, 30)):
        """Hunt for A1.Flex instances"""
        self.log("🏹 Simple but Effective A1.Flex Hunter")
        self.log(f"📊 {len(self.combinations)} combinations: {len(self.ads)} ADs × {len(self.configs)} configs")
        self.log(f"🎯 Max attempts: {max_attempts}, Delay: {delay_range[0]}-{delay_range[1]}s")
        
        start_time = time.time()
        combo_index = 0
        
        try:
            while self.attempts < max_attempts:
                # Cycle through combinations with some randomization
                if random.random() < 0.8:  # 80% systematic, 20% random
                    combo = self.combinations[combo_index % len(self.combinations)]
                    combo_index += 1
                else:
                    combo = random.choice(self.combinations)
                
                if self.try_create_instance(combo):
                    elapsed = time.time() - start_time
                    self.log(f"🎊 SUCCESS! Created after {self.attempts} attempts in {elapsed/60:.1f} minutes")
                    self._print_stats()
                    return True
                
                # Dynamic delay
                current_hour = datetime.now().hour
                if 23 <= current_hour or current_hour <= 3:  # Optimal hours
                    delay = random.randint(delay_range[0], delay_range[0] + 15)
                else:
                    delay = random.randint(delay_range[0], delay_range[1])
                
                # Progress update
                if self.attempts % 25 == 0:
                    elapsed = time.time() - start_time
                    rate = self.attempts / elapsed * 60
                    self.log(f"📈 Progress: {self.attempts} attempts, {elapsed/60:.1f}min, {rate:.1f}/min")
                    self._print_quick_stats()
                
                if self.attempts < max_attempts:
                    self.log(f"😴 Waiting {delay}s...")
                    time.sleep(delay)
                
        except KeyboardInterrupt:
            elapsed = time.time() - start_time  
            self.log(f"🛑 Stopped after {self.attempts} attempts in {elapsed/60:.1f} minutes")
            self._print_stats()
            return False
        
        elapsed = time.time() - start_time
        self.log(f"😞 Completed {max_attempts} attempts in {elapsed/60:.1f} minutes")
        self._print_stats()
        return False

    def _print_quick_stats(self):
        """Print quick stats"""
        ad_summary = {ad.split('-')[-1]: count for ad, count in self.ad_stats.items()}
        self.log(f"📊 ADs: {ad_summary}")
        
    def _print_stats(self):
        """Print detailed stats"""
        self.log("📈 Final Statistics:")
        
        # AD breakdown
        ad_summary = {ad.split('-')[-1]: count for ad, count in self.ad_stats.items()}
        self.log(f"  ADs: {ad_summary}")
        
        # Config breakdown  
        config_summary = {name: count for name, count in self.config_stats.items() if count > 0}
        self.log(f"  Configs: {config_summary}")
        
        # Most/least tried
        most_tried_ad = max(self.ad_stats.items(), key=lambda x: x[1])
        most_tried_config = max(self.config_stats.items(), key=lambda x: x[1])
        
        self.log(f"  Most tried AD: {most_tried_ad[0].split('-')[-1]} ({most_tried_ad[1]} attempts)")
        self.log(f"  Most tried config: {most_tried_config[0]} ({most_tried_config[1]} attempts)")

def main():
    hunter = SimpleA1Hunter()
    
    print("🎯 Simple but Effective A1.Flex Hunter for CodeQual V9")
    print("====================================================")
    print("🚀 Strategy:")
    print("   • Multiple ADs: AD-1, AD-2, AD-3")
    print("   • Multiple CPU configs: 4, 2, 1 OCPUs (prioritized)")
    print("   • Known working images: Ubuntu 22.04 + Oracle Linux 8")
    print("   • Optimized for capacity hunting")
    print()
    print("Press Ctrl+C at any time to stop")
    print()
    
    success = hunter.hunt(max_attempts=1000, delay_range=(10, 30))
    
    if success:
        print()
        print("🎉 SUCCESS! Your A1.Flex instance is ready!")
        print()
        print("🔧 Next steps:")
        print("1. SSH into your instance (IP shown above)")
        print("2. Install Docker: curl -fsSL https://get.docker.com | sh")
        print("3. Install k3s: curl -sfL https://get.k3s.io | sh")
        print("4. Deploy CodeQual V9 with parallel execution")
    else:
        print()
        print("💡 Next actions:")
        print("1. Try again during optimal hours (11 PM - 3 AM EST)")
        print("2. Consider paid upgrade (~$7/month) for guaranteed capacity")
        print("3. Check other cloud providers (GCP, AWS)")

if __name__ == "__main__":
    main()