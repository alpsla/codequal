# Docker Architecture Clarification Needed

**Date:** January 13, 2025
**Context:** ESLint Detection Fix - Session 28

---

## 🤔 Architecture Question

You mentioned that ESLint and TypeScript are pre-installed in your Docker registry image:
```
iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-typescript-v4.6-arm
```

This raises an important architecture question about how tools should be executed.

---

## 📊 Current Implementation

### TypeScriptToolParser (Current)
```typescript
// In typescript-tool-parser.ts:115
const command = `cd ${repoPath} && npx eslint ${fileArgs} --config .eslintrc.json --format json 2>&1`;
const { stdout } = await exec(command);
```

**This runs:**
- ❌ `npx eslint` on the HOST machine (Oracle server)
- ❌ May install ESLint locally via npm if not found
- ❌ Doesn't use your pre-installed Docker image

---

## 🔍 Two Possible Architectures

### **Architecture A: Orchestrator Runs IN Docker**
```
┌─────────────────────────────────────────┐
│  Docker Container (lang-typescript)     │
│  ┌────────────────────────────────────┐ │
│  │  Node.js Orchestrator              │ │
│  │  ├─ TypeScriptToolParser.ts        │ │
│  │  │  └─ exec('eslint ...')          │ │ (uses pre-installed ESLint)
│  │  │     ↓                            │ │
│  │  │  [ESLint binary in container]  │ │
│  └────────────────────────────────────┘ │
│  Mounts: /workspace → /path/to/repo     │
└─────────────────────────────────────────┘
```

**In this model:**
- ✅ Orchestrator runs inside container
- ✅ `exec('eslint')` uses pre-installed ESLint
- ✅ No local npm install needed
- ✅ Repository mounted at `/workspace`

**Current fix is CORRECT** - Just need `.eslintrc.json` at `/workspace/.eslintrc.json`

---

### **Architecture B: Orchestrator Runs on HOST, Launches Containers**
```
┌─────────────────────────────────────────┐
│  Oracle Server (Host)                   │
│  ┌────────────────────────────────────┐ │
│  │  Node.js Orchestrator (on host)   │ │
│  │  ├─ TypeScriptToolParser.ts        │ │
│  │  │  └─ docker run ...              │ │
│  │  │     ↓                            │ │
│  └─────────│──────────────────────────┘ │
│            │                             │
│            ↓                             │
│  ┌─────────────────────────────────┐   │
│  │  Docker Container                │   │
│  │  └─ eslint /workspace --config   │   │
│  │     (uses pre-installed ESLint)  │   │
│  └─────────────────────────────────┘   │
│  Mounts: /tmp/repo → /workspace         │
└─────────────────────────────────────────┘
```

**In this model:**
- ❌ Orchestrator runs on host (not in Docker)
- ❌ Must explicitly launch Docker containers
- ❌ Each tool execution = `docker run` command
- ✅ Similar to how Semgrep runner works

**Current fix is WRONG** - Need to wrap ESLint in `docker run`

---

## 🎯 Which Architecture Do You Use?

### **Option 1: Orchestrator IN Docker** (Recommended)
```bash
# On Oracle, you run:
docker run -v /path/to/repo:/workspace \
  iad.ocir.io/.../analyzer:lang-typescript-v4.6-arm \
  node /app/packages/agents/dist/analyze.js
```

**If this is your setup:**
- ✅ Current fix is CORRECT
- ✅ `npx eslint` will use pre-installed ESLint
- ✅ Just need to ensure `.eslintrc.json` is in `/workspace`
- ⚠️ Need to verify ESLint is in container's PATH

---

### **Option 2: Orchestrator on HOST** (Like Semgrep)
```bash
# On Oracle, you run:
cd /home/opc/codequal/packages/agents
npx ts-node test-v9-lite-e2e.ts
# (Runs on host, launches Docker for each tool)
```

**If this is your setup:**
- ❌ Current fix is INCOMPLETE
- ❌ Need to wrap ESLint in `docker run` command
- ✅ Similar to UniversalSemgrepRunner pattern
- ✅ Repository mounted as volume

---

## 🔧 Fix for Architecture B (If Needed)

### Update TypeScriptToolParser to Use Docker

**File:** `src/two-branch/parsers/typescript-tool-parser.ts`

```typescript
async runESLint(repoPath: string, files?: string[]): Promise<TypeScriptToolResult> {
  const startTime = Date.now();

  // Get Docker image from orchestrator config
  const dockerImage = this.dockerImage || 'iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-typescript-v4.6-arm';

  // Build file arguments
  let fileArgs = files && files.length > 0 ? files.join(' ') : '.';

  // Docker command using pre-installed ESLint
  const command = `docker run --rm \
    -v "${repoPath}:/workspace" \
    -w /workspace \
    ${dockerImage} \
    eslint ${fileArgs} --config .eslintrc.json --format json 2>&1`;

  // Execute in Docker
  const { stdout, stderr } = await exec(command, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120000
  });

  // Parse results...
}
```

**Benefits:**
- ✅ Uses pre-installed ESLint from Docker image
- ✅ No local npm install
- ✅ Consistent with Semgrep pattern
- ✅ Repository mounted at `/workspace`

---

## 📋 Questions to Answer

1. **How do you currently run the orchestrator on Oracle?**
   - `docker run ...` (Architecture A)
   - `npx ts-node ...` on host (Architecture B)

2. **Where is Node.js running?**
   - Inside Docker container
   - On Oracle host (outside Docker)

3. **How should tools be executed?**
   - Direct `exec('eslint')` (tools in container with Node.js)
   - `docker run` commands (Node.js on host, tools in containers)

4. **What's in your TypeScript Docker image?**
   - ESLint + TypeScript + Node.js + Orchestrator code?
   - Or just ESLint + TypeScript (orchestrator separate)?

---

## 🚀 Next Steps

### **If Architecture A (Orchestrator in Docker):**
1. ✅ Current fix is correct
2. Test that ESLint binary exists in container: `docker run ... which eslint`
3. Verify `.eslintrc.json` is accessible at `/workspace/.eslintrc.json`
4. Check ESLint can read repo files

### **If Architecture B (Orchestrator on Host):**
1. Update TypeScriptToolParser to use `docker run`
2. Pattern after UniversalSemgrepRunner
3. Mount repository as volume
4. Pass config file path to container

---

## 📝 Diagnostic Commands

### Test Architecture A (Orchestrator in Docker):
```bash
# Test if ESLint is in container
docker run --rm iad.ocir.io/.../analyzer:lang-typescript-v4.6-arm which eslint

# Test ESLint can run
docker run --rm -v $(pwd):/workspace -w /workspace \
  iad.ocir.io/.../analyzer:lang-typescript-v4.6-arm \
  eslint --version
```

### Test Architecture B (Host + Docker):
```bash
# Test from host
cd /home/opc/codequal/packages/agents
which node  # Should show host Node.js
docker ps   # Should show no running orchestrator container

# Test Docker tool execution
docker run --rm iad.ocir.io/.../analyzer:lang-typescript-v4.6-arm eslint --version
```

---

Please clarify your architecture so I can provide the correct fix! 🙏
