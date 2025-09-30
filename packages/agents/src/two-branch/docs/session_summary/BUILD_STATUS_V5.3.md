# Docker Image v5.3 Build Status

**Image**: analyzer:lang-java-v5.3-arm
**Started**: 2025-09-30 19:15 PST
**Status**: Building (check with BashOutput 39bdfd)
**Log**: `/tmp/docker-build-v5.3.log`

---

## Post-Build Actions

### 1. Tag Image
```bash
docker tag analyzer:lang-java-v5.3-arm \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm
```

### 2. Push to Registry
```bash
docker push registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm
```

### 3. Deploy to Oracle Cloud
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" \
  opc@129.213.49.128 \
  "docker pull registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm"
```

### 4. Test Dependency-Check
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" \
  opc@129.213.49.128 << 'ENDSSH'
docker run --rm \
  -v /tmp/petclinic:/workspace:ro \
  -v /tmp/dependency-check-data:/data \
  -e NVD_API_KEY=1daf9d02-c365-499f-a834-ca9c1d3ae3c5 \
  --entrypoint=/bin/bash \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm \
  -c "dependency-check --version && \
      dependency-check --project PetClinic \
        --scan /workspace \
        --format JSON \
        --nvdApiKey \$NVD_API_KEY \
        --data /data \
        --out /workspace/dep-check-results \
        --failOnCVSS 0"
ENDSSH
```

---

## What's New in v5.3

- Dependency-Check: 8.4.0 → 11.1.0
- NVD API v2.0 support (`--nvdApiKey` parameter)
- SpotBugs: 4.7.3 → 4.8.6
- Semgrep: Updated to 1.45.0

---

## Expected First Run

Database download (first time only):
- Size: ~3GB
- Time: 10-15 minutes
- Subsequent runs: 30-60 seconds

---

## Verification

- [ ] Image built successfully
- [ ] Tagged for registry
- [ ] Pushed to registry
- [ ] Pulled on Oracle server
- [ ] Dependency-Check version 11.1.0
- [ ] `--nvdApiKey` parameter works
- [ ] CVE scan completes
- [ ] JSON output generated
