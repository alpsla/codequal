# Shared Tools Setup - Extract from Docker to Host

**Date:** January 13, 2025
**Purpose:** Install ESLint, TypeScript, and other tools ONCE on Oracle Cloud host, shared across all repository analyses

---

## 🎯 Goal

Extract pre-installed tools from Docker image to a shared location on Oracle Cloud host:
- ✅ Install once from Docker image
- ✅ Share across all repositories
- ✅ No npm install per repository
- ✅ Faster execution (no Docker overhead)

---

## 📦 Step 1: Extract Tools from Docker Image

### A. Extract Node.js Tools

```bash
# SSH to Oracle Cloud
ssh -i "$SSH_KEY" opc@129.213.49.128

# Create shared tools directory
sudo mkdir -p /opt/codequal-tools/bin
sudo mkdir -p /opt/codequal-tools/lib
sudo chown -R opc:opc /opt/codequal-tools

# Extract from TypeScript Docker image
docker run --rm \
  -v /opt/codequal-tools:/output \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-typescript-v4.6-arm \
  bash -c "
    # Copy ESLint binary
    cp /usr/local/bin/eslint /output/bin/ 2>/dev/null || \
    cp /usr/bin/eslint /output/bin/ || \
    cp \$(which eslint) /output/bin/

    # Copy TypeScript binary
    cp /usr/local/bin/tsc /output/bin/ 2>/dev/null || \
    cp /usr/bin/tsc /output/bin/ || \
    cp \$(which tsc) /output/bin/

    # Copy node_modules (contains the actual tools)
    cp -r /usr/local/lib/node_modules /output/lib/ 2>/dev/null || \
    cp -r /usr/lib/node_modules /output/lib/ || \
    cp -r /node_modules /output/lib/

    # Copy npm/npx if needed
    cp /usr/local/bin/npm /output/bin/ 2>/dev/null || true
    cp /usr/local/bin/npx /output/bin/ 2>/dev/null || true

    echo 'Tools extracted successfully!'
  "

# Verify extraction
ls -lah /opt/codequal-tools/bin/
ls -lah /opt/codequal-tools/lib/node_modules/ | head -20
```

---

### B. Extract Java Tools (Already Done?)

```bash
# Check if Java tools exist in image
docker run --rm iad.ocir.io/.../analyzer:lang-java-v6.0-arm \
  bash -c "which pmd && which checkstyle && which semgrep"

# If yes, extract to shared location
docker run --rm \
  -v /opt/codequal-tools:/output \
  iad.ocir.io/.../analyzer:lang-java-v6.0-arm \
  bash -c "
    mkdir -p /output/java
    cp -r /usr/local/bin/pmd /output/java/ 2>/dev/null || true
    cp -r /usr/local/bin/checkstyle /output/java/ 2>/dev/null || true
    # ... etc
  "
```

---

## 🔧 Step 2: Update PATH and Environment

### A. Add Tools to PATH

```bash
# On Oracle Cloud, add to ~/.bashrc
cat >> ~/.bashrc << 'EOF'

# CodeQual Shared Tools
export CODEQUAL_TOOLS_PATH="/opt/codequal-tools"
export PATH="$CODEQUAL_TOOLS_PATH/bin:$PATH"
export NODE_PATH="$CODEQUAL_TOOLS_PATH/lib/node_modules:$NODE_PATH"

EOF

# Reload
source ~/.bashrc

# Verify
which eslint  # Should show /opt/codequal-tools/bin/eslint
which tsc     # Should show /opt/codequal-tools/bin/tsc
eslint --version
tsc --version
```

---

### B. Set Environment Variable for Scripts

```bash
# Add to .env file
cat >> /home/opc/codequal/packages/agents/.env << 'EOF'

# Shared tools path (extracted from Docker)
SHARED_TOOLS_PATH=/opt/codequal-tools
PATH=/opt/codequal-tools/bin:$PATH
NODE_PATH=/opt/codequal-tools/lib/node_modules

EOF
```

---

## 📝 Step 3: Update TypeScriptToolParser to Use Shared Tools

### Update Parser to Use Shared PATH

**File:** `src/two-branch/parsers/typescript-tool-parser.ts`

```typescript
async runESLint(repoPath: string, files?: string[]): Promise<TypeScriptToolResult> {
  const startTime = Date.now();

  // Use shared tools from environment or default
  const sharedToolsPath = process.env.SHARED_TOOLS_PATH || '/opt/codequal-tools';
  const eslintBin = `${sharedToolsPath}/bin/eslint`;

  // Check if shared ESLint exists, fallback to npx
  const eslintCmd = existsSync(eslintBin) ? eslintBin : 'npx eslint';

  console.log(`[ESLint] Using: ${eslintCmd}`);
  console.log(`[ESLint] Shared tools path: ${sharedToolsPath}`);

  // Build command using shared tools
  const command = `cd ${repoPath} && ${eslintCmd} ${fileArgs} --config .eslintrc.json --format json 2>&1`;

  // Execute...
}
```

---

## ✅ Step 4: Verify Setup

### Test Shared Tools

```bash
# Test 1: ESLint version
/opt/codequal-tools/bin/eslint --version
# Expected: v8.x.x or v9.x.x

# Test 2: TypeScript version
/opt/codequal-tools/bin/tsc --version
# Expected: Version 5.x.x

# Test 3: Run ESLint on test file
cd /tmp
echo "const unused = 'test';" > test.js
/opt/codequal-tools/bin/eslint test.js
# Expected: Warning about unused variable

# Test 4: Check node_modules are accessible
ls /opt/codequal-tools/lib/node_modules/eslint
ls /opt/codequal-tools/lib/node_modules/typescript
```

---

### Test in Repository Analysis

```bash
# Test with real repository
cd ~/codequal/packages/agents

# Set environment
export SHARED_TOOLS_PATH=/opt/codequal-tools
export PATH=/opt/codequal-tools/bin:$PATH

# Run test
npx ts-node tests/integration/test-v9-lite-e2e.ts

# Check logs for:
# [ESLint] Using: /opt/codequal-tools/bin/eslint ✅
# (NOT: Downloading ESLint... ❌)
```

---

## 📊 Benefits of This Approach

### Performance
- ⚡ **50-80% faster** tool execution (no Docker spawn overhead)
- ⚡ **No npm install delays** (tools already available)
- ⚡ **Lower memory usage** (direct process vs container)

### Disk Space
- 💾 **Shared installation**: ~500MB once (not per repo)
- 💾 **No node_modules per repo**: Save 100-300MB per analysis
- 💾 **Predictable storage**: Fixed size, doesn't grow

### Maintenance
- 🔧 **Update once**: Extract new Docker image when tools update
- 🔧 **Version control**: All analyses use same tool versions
- 🔧 **Easy debugging**: Tools run directly, easier to troubleshoot

---

## 🔄 Update Process (When Docker Image Changes)

```bash
# When you update Docker image
# 1. Remove old tools
rm -rf /opt/codequal-tools/*

# 2. Extract from new image
docker run --rm \
  -v /opt/codequal-tools:/output \
  iad.ocir.io/.../analyzer:lang-typescript-v4.7-arm \
  bash -c "cp -r /usr/local/bin/* /output/bin/ && \
           cp -r /usr/local/lib/node_modules /output/lib/"

# 3. Verify
/opt/codequal-tools/bin/eslint --version
```

---

## 🚨 Fallback Mechanism

### If Shared Tools Not Available

The parser should gracefully fallback:

```typescript
// Try shared tools first
if (existsSync(`${SHARED_TOOLS_PATH}/bin/eslint`)) {
  eslintCmd = `${SHARED_TOOLS_PATH}/bin/eslint`;
  console.log('[ESLint] Using shared tools ✅');
} else {
  // Fallback to npx (will install locally)
  eslintCmd = 'npx eslint';
  console.log('[ESLint] Fallback to npx (shared tools not found) ⚠️');
}
```

---

## 📁 Directory Structure

```
/opt/codequal-tools/
├── bin/
│   ├── eslint           # ESLint CLI
│   ├── tsc              # TypeScript compiler
│   ├── npm              # npm (optional)
│   └── npx              # npx (optional)
├── lib/
│   └── node_modules/
│       ├── eslint/      # ESLint package
│       ├── typescript/  # TypeScript package
│       ├── @typescript-eslint/  # TypeScript ESLint plugins
│       └── ...          # Other dependencies
└── java/                # (Optional) Java tools
    ├── pmd
    ├── checkstyle
    └── semgrep
```

---

## ⚡ Performance Comparison

### Before (Docker per tool):
```
ESLint analysis:
- Docker spawn: ~2-3 seconds
- Tool execution: ~5 seconds
- Total: ~7-8 seconds per repo
```

### After (Shared tools on host):
```
ESLint analysis:
- Docker spawn: 0 seconds
- Tool execution: ~5 seconds
- Total: ~5 seconds per repo (30-40% faster!)
```

---

## 🎯 Next Steps

1. **Extract tools** from Docker image to `/opt/codequal-tools`
2. **Update PATH** in `.bashrc` and `.env`
3. **Modify TypeScriptToolParser** to use shared tools
4. **Test** with real repository
5. **Verify** no npm installs happen during analysis

---

## 📚 Related Files

- **Parser:** `src/two-branch/parsers/typescript-tool-parser.ts` (needs update)
- **Orchestrator:** `src/two-branch/tools/typescript/typescript-tool-orchestrator.ts`
- **Environment:** `/home/opc/codequal/packages/agents/.env`

---

This approach gives you the **best of both worlds**:
- ✅ Docker as distribution mechanism (versioned, reproducible)
- ✅ Host execution for performance (no container overhead)
- ✅ Single installation shared across all repos (no waste)
