#!/usr/bin/env python3
"""
Simple HTTP server that serves mock DeepWiki metrics in Prometheus format
Run this to test Grafana dashboards without complex setup
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import time
import random
import math

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            # Generate mock metrics
            current_time = time.time()
            
            # Simulate disk usage that varies over time
            base_usage = 20
            variation = math.sin(current_time / 300) * 5  # Varies ±5% every 5 minutes
            disk_usage_percent = base_usage + variation
            
            # Other metrics
            disk_total_gb = 10
            disk_used_gb = disk_total_gb * (disk_usage_percent / 100)
            disk_available_gb = disk_total_gb - disk_used_gb
            active_repos = random.randint(2, 5)
            
            metrics = f"""# HELP deepwiki_disk_usage_percent Percentage of disk space used
# TYPE deepwiki_disk_usage_percent gauge
deepwiki_disk_usage_percent {disk_usage_percent:.2f}

# HELP deepwiki_disk_used_gb Disk space used in GB
# TYPE deepwiki_disk_used_gb gauge
deepwiki_disk_used_gb {disk_used_gb:.2f}

# HELP deepwiki_disk_available_gb Available disk space in GB
# TYPE deepwiki_disk_available_gb gauge
deepwiki_disk_available_gb {disk_available_gb:.2f}

# HELP deepwiki_disk_total_gb Total disk space in GB
# TYPE deepwiki_disk_total_gb gauge
deepwiki_disk_total_gb {disk_total_gb}

# HELP deepwiki_active_repositories Number of repositories currently on disk
# TYPE deepwiki_active_repositories gauge
deepwiki_active_repositories {active_repos}

# HELP deepwiki_repositories_analyzed_total Total repositories analyzed
# TYPE deepwiki_repositories_analyzed_total counter
deepwiki_repositories_analyzed_total {int(current_time / 100)}

# HELP deepwiki_cleanup_success_count Total successful cleanups
# TYPE deepwiki_cleanup_success_count counter
deepwiki_cleanup_success_count {int(current_time / 200)}

# HELP deepwiki_cleanup_failed_count Total failed cleanups
# TYPE deepwiki_cleanup_failed_count counter
deepwiki_cleanup_failed_count {int(current_time / 1000)}
"""
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; version=0.0.4')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(metrics.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        # Suppress request logging
        pass

def run_server(port=9091):
    server = HTTPServer(('localhost', port), MetricsHandler)
    print(f"Mock metrics server running on http://localhost:{port}/metrics")
    print(f"Configure Grafana Prometheus data source to use: http://localhost:{port}")
    print("Press Ctrl+C to stop")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()

if __name__ == '__main__':
    run_server()