# DeepWiki Repository Cloning Issue - Quick Fix Commands

## Step 1: Check DeepWiki Pod Status
```bash
# Check if DeepWiki pod is running
kubectl get pods -n codequal-dev -l app=deepwiki

# If multiple pods exist, delete the stuck ones
kubectl delete pod <POD_NAME> -n codequal-dev
```

## Step 2: Start Port Forwarding
```bash
# Kill any existing port forwarding
pkill -f "port-forward.*8001" 2>/dev/null

# Start new port forwarding
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 &

# Verify port forwarding is working
sleep 3
curl http://localhost:8001/health
```

## Step 3: Check Git Configuration in Pod
```bash
# Check current git configuration
kubectl exec -n codequal-dev deployment/deepwiki -- git config --global --list | grep url

# The output should show something like:
# url.https://ghp_TOKEN@github.com/.insteadof=https://github.com/
```

## Step 4: Fix Git Configuration (if needed)
```bash
# If there's an issue with git config, fix it:
kubectl exec -n codequal-dev deployment/deepwiki -- bash -c "
git config --global --unset-all url.'https://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@github.com/'.insteadOf 2>/dev/null
git config --global url.'https://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@github.com/'.insteadOf 'https://github.com/'
echo 'Git config updated'
"
```

## Step 5: Test Repository Cloning
```bash
# First, verify the repository exists (CRITICAL STEP!)
curl -s -o /dev/null -w "%{http_code}" https://api.github.com/repos/sindresorhus/ky
# Should return: 200

# Test cloning a VALID repository in the pod
kubectl exec -n codequal-dev deployment/deepwiki -- bash -c "
rm -rf /tmp/test-repo 2>/dev/null
git clone --depth=1 https://github.com/sindresorhus/ky /tmp/test-repo
if [ -d /tmp/test-repo ]; then 
    echo '✅ Clone successful!'
    rm -rf /tmp/test-repo
else
    echo '❌ Clone failed'
fi
"
```

## Step 6: Test DeepWiki API
```bash
# Create a test script
cat > test-deepwiki-quick.ts << 'EOF'
import axios from 'axios';

async function testDeepWiki() {
  console.log('🔍 Testing DeepWiki API...\n');
  
  try {
    const response = await axios.post(
      'http://localhost:8001/chat/completions/stream',
      {
        repo_url: 'https://github.com/sindresorhus/ky',  // VALID repo!
        messages: [{
          role: 'user',
          content: 'Find one code issue in this repository'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 500
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    console.log('✅ DeepWiki is working!');
    console.log('Response:', typeof response.data === 'string' 
      ? response.data.substring(0, 200) 
      : JSON.stringify(response.data, null, 2).substring(0, 200));
  } catch (error: any) {
    console.log('❌ Error:', error.message);
    if (error.response?.data) {
      console.log('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDeepWiki();
EOF

# Run the test
npx ts-node test-deepwiki-quick.ts
```

## Common Issues and Solutions

### Issue 1: "Repository not found"
**Check:** Does the repository actually exist?
```bash
# Replace with your test repo
REPO_URL="sindresorhus/is-odd"  # This doesn't exist!
curl -s -o /dev/null -w "%{http_code}" https://api.github.com/repos/$REPO_URL

# If returns 404, the repo doesn't exist. Use a valid one:
# - sindresorhus/ky
# - sindresorhus/p-limit
# - facebook/react
```

### Issue 2: Git authentication issues
```bash
# Check if GitHub token is valid
kubectl exec -n codequal-dev deployment/deepwiki -- bash -c "
git ls-remote https://github.com/sindresorhus/ky 2>&1 | head -1
"
# Should show a commit hash, not an error
```

### Issue 3: Port forwarding not working
```bash
# Check if port 8001 is already in use
lsof -i :8001

# Kill all port forwarding and restart
pkill -f "kubectl port-forward"
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 &
```

## Quick One-Liner Health Check
```bash
# Complete health check in one command
kubectl get pods -n codequal-dev -l app=deepwiki && \
curl -s http://localhost:8001/health | jq -r '.status' && \
kubectl exec -n codequal-dev deployment/deepwiki -- git clone --depth=1 https://github.com/sindresorhus/ky /tmp/test 2>&1 | grep -q "Cloning" && echo "✅ All systems operational" || echo "❌ Check failed"
```

## CRITICAL NOTES
⚠️ **NEVER use `sindresorhus/is-odd` - it doesn't exist!**
✅ **ALWAYS use valid repos like `sindresorhus/ky` for testing**
🔍 **ALWAYS verify repo exists with GitHub API before testing**

## Valid Test Repositories
```bash
# Small, reliable repos for testing:
- https://github.com/sindresorhus/ky
- https://github.com/sindresorhus/p-limit
- https://github.com/sindresorhus/ora
- https://github.com/vercel/swr
- https://github.com/facebook/react
```

## Full Reset (if nothing else works)
```bash
# 1. Delete and recreate the pod
kubectl delete pod -n codequal-dev -l app=deepwiki
kubectl rollout restart deployment/deepwiki -n codequal-dev

# 2. Wait for pod to be ready
kubectl wait --for=condition=ready pod -n codequal-dev -l app=deepwiki --timeout=120s

# 3. Restart port forwarding
pkill -f "port-forward.*8001"
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 &

# 4. Configure git (with valid token)
./scripts/configure-deepwiki-git.sh

# 5. Test
curl http://localhost:8001/health
```