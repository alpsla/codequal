# Container Testing Instructions

## Quick Validation (5 minutes)

### 1. Simple Container Test
```bash
# Test each container can run
./test-all-containers.sh
```

### 2. Manual Quick Test
```bash
# Test a single language (replace 'python' with any language)
kubectl run test-python --image=registry.digitalocean.com/codequal-registry/analyzer:lang-python-v3 \
  --rm -it --restart=Never -n codequal-dev -- python3 --version
```

## Integration Testing (15 minutes)

### 1. Full Workflow Test
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node test-full-workflow-integration.ts
```

This tests:
- Repository cloning
- Caching with Redis
- Code indexing
- PR branch analysis
- Agent configuration
- Tool execution
- Analysis generation
- Report creation

### 2. Language-Specific Tests
```bash
# Test each language processor
node test-language-simple-pr.js
```

## Push Remaining Languages

### Option 1: Automated Push Script
```bash
chmod +x push-remaining-languages.sh
./push-remaining-languages.sh
```

### Option 2: Manual Push Commands
```bash
# Push Java
kubectl apply -f - <<'EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: push-java
  namespace: codequal-dev
spec:
  template:
    spec:
      containers:
      - name: kaniko
        image: gcr.io/kaniko-project/executor:latest
        args:
        - "--dockerfile=/workspace/Dockerfile"
        - "--context=dir:///workspace"
        - "--destination=registry.digitalocean.com/codequal-registry/analyzer:lang-java-v3"
        volumeMounts:
        - name: dockerfile
          mountPath: /workspace
        - name: kaniko-secret
          mountPath: /kaniko/.docker
      restartPolicy: Never
      volumes:
      - name: dockerfile
        configMap:
          name: dockerfile-java
      - name: kaniko-secret
        secret:
          secretName: registry-codequal
          items:
          - key: .dockerconfigjson
            path: config.json
EOF

# Repeat for ruby, php, cpp, perl
```

## Verify All Containers

### Check Registry Status
```bash
# List all images in registry
doctl registry repository list-v2 codequal-registry

# Expected output: 10 language containers + API
# - lang-python-v3
# - lang-javascript-v3
# - lang-java-v3
# - lang-go-v3
# - lang-rust-v3
# - lang-ruby-v3
# - lang-php-v3
# - lang-cpp-v3
# - lang-csharp-v3
# - lang-perl-v3
```

### Cleanup Untagged Images
```bash
# Remove <none> tags
doctl registry garbage-collection start codequal-registry --include-untagged-manifests --force
```

## Container Validation Matrix

| Language | Image Tag | Size | Tools Included |
|----------|-----------|------|----------------|
| Python | lang-python-v3 | ~200MB | bandit, pylint, flake8, mypy |
| JavaScript | lang-javascript-v3 | ~180MB | eslint, prettier, typescript |
| Java | lang-java-v3 | ~400MB | JDK 17 |
| Go | lang-go-v3 | ~350MB | go 1.21 |
| Rust | lang-rust-v3 | ~600MB | rustc, clippy, rustfmt |
| Ruby | lang-ruby-v3 | ~150MB | brakeman, rubocop |
| PHP | lang-php-v3 | ~80MB | PHP 8.2 CLI |
| C++ | lang-cpp-v3 | ~250MB | g++, cppcheck |
| C# | lang-csharp-v3 | ~500MB | .NET 6.0 SDK |
| Perl | lang-perl-v3 | ~120MB | Perl 5.38 |

## Success Criteria

✅ All 10 containers exist in registry
✅ Registry usage under 5GB (expect ~2.5GB total)
✅ Each container responds to version check
✅ Integration test passes
✅ No untagged/orphaned images

## Troubleshooting

### If a build fails:
```bash
# Check logs
kubectl logs -n codequal-dev job/build-<language>-final

# Retry single language
kubectl delete job build-<language>-final -n codequal-dev
./push-remaining-languages.sh  # Will rebuild missing ones
```

### If registry fills up:
```bash
# Run garbage collection
doctl registry garbage-collection start codequal-registry --force

# Check usage
doctl registry get
```

## Next Steps After Testing

1. Update deployment manifests to use v3 containers
2. Remove backup pods (they were temporary)
3. Document container versions in main README
4. Set up CI/CD for automatic container updates