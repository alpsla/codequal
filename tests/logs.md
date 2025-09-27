Executive recommendation
•  Start with bare Docker on one A1.Flex (4 OCPU, 24GB). It minimizes overhead and maximizes per-core throughput.
•  Use CPU pinning (--cpuset-cpus) and separate output directories per tool to avoid write contention.
•  Keep the repo read-only and write tool outputs to separate subfolders to reduce lock thrashing.
•  Optional high-performance extras: tmpfs for hot reads, or an attached “Higher Performance” Block Volume for sustained I/O.

After A1.Flex is provisioned and you SSH in as ubuntu
1) Install Docker and minimal tuning

sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
sudo systemctl enable --now docker
newgrp docker

# Smaller logging overhead
sudo mkdir -p /etc/docker
cat <<'JSON' | sudo tee /etc/docker/daemon.json
{
  "log-driver": "local",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
sudo systemctl restart docker

2) Workspace layout and fast paths

sudo mkdir -p /mnt/workspace/repos /mnt/workspace/output
sudo chown -R $USER:$USER /mnt/workspace

# Optionally: use RAM for hot reads (fits small/medium repos)
# Mount ~8G tmpfs for repo clone, results still go to disk:
sudo mount -t tmpfs -o size=8g tmpfs /mnt/workspace/repos

# Clone your PR target repo(s) into the repos area
git clone --depth=10 https://github.com/<org>/<repo>.git /mnt/workspace/repos/repo
# Checkout PR branch if desired

3) Registry login and pre-pull analyzers
docker login registry.digitalocean.com -u {{DO_USERNAME}} -p {{DO_ACCESS_TOKEN}}

docker pull registry.digitalocean.com/codequal/analyzer:lang-java-v5.1
docker pull registry.digitalocean.com/codequal/analyzer:lang-python-v4.3
docker pull registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3
docker pull registry.digitalocean.com/codequal/analyzer:security-v4.2
# pull any others you plan to run

4) Run analyzers in parallel, pinning each to a core
•  Rule of thumb for 4 OCPUs: run 4 “heavy” analyzers at once.
•  Keep repo read-only; write each tool’s results into its own folder.

# Core 0 — Java
docker run -d --name analyzer-java \
  --cpuset-cpus="0" --memory="5g" \
  -v /mnt/workspace/repos/repo:/workspace/repo:ro \
  -v /mnt/workspace/output/java:/workspace/output \
  registry.digitalocean.com/codequal/analyzer:lang-java-v5.1 \
  /analyze.sh /workspace/repo /workspace/output

# Core 1 — Security
docker run -d --name analyzer-security \
  --cpuset-cpus="1" --memory="5g" \
  -v /mnt/workspace/repos/repo:/workspace/repo:ro \
  -v /mnt/workspace/output/security:/workspace/output \
  registry.digitalocean.com/codequal/analyzer:security-v4.2 \
  /analyze.sh /workspace/repo /workspace/output

# Core 2 — Python
docker run -d --name analyzer-python \
  --cpuset-cpus="2" --memory="5g" \
  -v /mnt/workspace/repos/repo:/workspace/repo:ro \
  -v /mnt/workspace/output/python:/workspace/output \
  registry.digitalocean.com/codequal/analyzer:lang-python-v4.3 \
  /analyze.sh /workspace/repo /workspace/output

# Core 3 — JS/TS
docker run -d --name analyzer-js \
  --cpuset-cpus="3" --memory="5g" \
  -v /mnt/workspace/repos/repo:/workspace/repo:ro \
  -v /mnt/workspace/output/js:/workspace/output \
  registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3 \
  /analyze.sh /workspace/repo /workspace/output

# Monitor
docker ps --format 'table {{.Names}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.Status}}'
docker stats --no-stream

Compose option (cleaner orchestration)
version: "3.8"

services:
  analyzer-java:
    image: registry.digitalocean.com/codequal/analyzer:lang-java-v5.1
    cpuset: "0"
    mem_limit: 5g
    volumes:
      - /mnt/workspace/repos/repo:/workspace/repo:ro
      - /mnt/workspace/output/java:/workspace/output
    command: ["/analyze.sh", "/workspace/repo", "/workspace/output"]

  analyzer-security:
    image: registry.digitalocean.com/codequal/analyzer:security-v4.2
    cpuset: "1"
    mem_limit: 5g
    volumes:
      - /mnt/workspace/repos/repo:/workspace/repo:ro
      - /mnt/workspace/output/security:/workspace/output
    command: ["/analyze.sh", "/workspace/repo", "/workspace/output"]

  analyzer-python:
    image: registry.digitalocean.com/codequal/analyzer:lang-python-v4.3
    cpuset: "2"
    mem_limit: 5g
    volumes:
      - /mnt/workspace/repos/repo:/workspace/repo:ro
      - /mnt/workspace/output/python:/workspace/output
    command: ["/analyze.sh", "/workspace/repo", "/workspace/output"]

  analyzer-js:
    image: registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3
    cpuset: "3"
    mem_limit: 5g
    volumes:
      - /mnt/workspace/repos/repo:/workspace/repo:ro
      - /mnt/workspace/output/js:/workspace/output
    command: ["/analyze.sh", "/workspace/repo", "/workspace/output"]

    Run it:
    docker compose up -d
docker compose ps

5) Where performance really comes from on A1.Flex
•  CPU: Ampere A1 OCPUs are single hardware threads; pin 1 heavy analyzer per OCPU.
•  Memory: leave headroom; 4 tools at 5G each + OS is safe on 24G.
•  I/O:
◦  Use repo as read-only mount. Each tool writes to its own output dir → no lock contention.
◦  tmpfs for repo (8–12G) will often outperform block storage by 2–5x on read-heavy tools.
◦  If you need sustained high I/O, attach a separate Block Volume with “Higher Performance” and bind-mount it:
▪  Create + attach a Block Volume (once the instance exists); format/mount at /mnt/fast
▪  Bind-mount: -v /mnt/fast/repos/repo:/workspace/repo:ro and -v /mnt/fast/output/java:/workspace/output

6) Converging this PoC into the V9 framework
•  Wrap these docker run/compose steps behind your V9ToolOrchestrator runner for “local” backend, keeping the same analyzer images and output schema. That gives you a predictable upgrade path to K8s later without changing tool contracts.
•  When scaling to multi-user:
◦  Move to k3s/AKS/GKE/EKS or Nomad once a single node is saturated.
◦  Replace tmpfs with network storage (NFS/FSS/EFS/Filestore) or per-node warm caches + object storage.

7) Quick checklist for best throughput now
•  Pre-pull all required images (no cold pulls during the run)
•  Use tmpfs for repo reads if it fits; otherwise keep repo on separate high-perf volume
•  Keep repo read-only; isolate tool outputs
•  Pin heavy analyzers to distinct CPUs
•  Keep logs small (local log driver with rotation)
•  Avoid running more than 4 CPU-bound containers at once on a 4 OCPU node