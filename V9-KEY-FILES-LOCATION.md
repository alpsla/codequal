# V9 KEY FILES LOCATION GUIDE

## 📁 Files Created This Session (Use These!)

All these files are in the **PROJECT ROOT** directory:
`/Users/alpinro/Code Prjects/codequal/`

| File | Purpose | How to Use |
|------|---------|------------|
| `v9-api-service.js` | REST API for V9 system | `node v9-api-service.js` |
| `test-v9-simple-verification.js` | Quick system check | `node test-v9-simple-verification.js` |
| `test-v9-kafka-real.js` | Full Kafka test | `node test-v9-kafka-real.js` |
| `generate-v9-final-report.js` | Report generator | `node generate-v9-final-report.js` |
| `V9-QUICK-START.sh` | Verification script | `bash V9-QUICK-START.sh` |

## 📚 Documentation Files (Read These!)

| File | Location | Purpose |
|------|----------|---------|
| `V9-SYSTEM-OVERVIEW.md` | Project root | Complete V9 infrastructure documentation |
| `NEXT-SESSION-ACTION-PLAN.md` | Project root | What to do in next session |
| `V9-SESSION-FINAL-SUMMARY.md` | Project root | This session's achievements |
| `V9-KEY-FILES-LOCATION.md` | Project root | This file - where everything is |
| `V9_CANONICAL_ARCHITECTURE.md` | `/packages/agents/` | The canonical V9 flow |

## 🔧 Existing V9 Components (Already Built)

| Component | Location | Purpose |
|-----------|----------|---------|
| V9ToolOrchestrator | `/packages/agents/src/two-branch/analyzers/v9-tool-orchestrator.ts` | Tool execution |
| V9RepositoryManager | `/packages/agents/src/two-branch/analyzers/v9-repository-manager.ts` | Repo management |
| SmartFileSelector | `/packages/agents/src/two-branch/utils/smart-file-selector.ts` | File selection |
| Enhanced Fix Generator | `/packages/agents/src/two-branch/services/enhanced-fix-generator.ts` | AI fix generation |
| 5 Specialized Agents | `/packages/agents/src/two-branch/agents/specialized-agents.ts` | The 5 agents |

## 🧪 Working Test Reference

The VERIFIED WORKING test implementation:
```
/packages/agents/test-v8-final.ts
```

## ⚠️ DO NOT CONFUSE WITH

These are OLD or ARCHIVED - do not use:
- ❌ `/apps/api/*` - Different API, not V9
- ❌ `/_ARCHIVED_*` folders - Old implementations
- ❌ `/packages/agents/_ARCHIVED_DO_NOT_USE/` - Deprecated code
- ❌ Any file with "deprecated", "old", "backup" in the name

## 🚀 Quick Start Commands

```bash
# 1. Check where you are
pwd
# Should be: /Users/alpinro/Code Prjects/codequal

# 2. Verify system
node test-v9-simple-verification.js

# 3. Start API (in root directory!)
node v9-api-service.js

# 4. Test API (in another terminal)
curl http://localhost:3001/api/v1/test
```

## 📝 Remember

**ALL the files you need are in the PROJECT ROOT directory.**

If someone says "use the API service", they mean:
```
/Users/alpinro/Code Prjects/codequal/v9-api-service.js
```

NOT anything in apps/api/ or elsewhere!

---

*This guide prevents confusion about which files to use.*