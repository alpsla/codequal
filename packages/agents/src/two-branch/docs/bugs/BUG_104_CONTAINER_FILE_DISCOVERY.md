# BUG-104: Container File Discovery Failure

**Severity**: HIGH
**Component**: Kubernetes Container Tool Execution
**Status**: 🔍 INVESTIGATING
**Created**: 2025-09-17
**Session**: V9 Kubernetes Cloud Framework Testing

## 📋 Summary
Repository cloning succeeds in Kubernetes containers, but file enumeration returns 0 files, preventing tool execution from accessing cloned repository contents.

## 🔍 Reproduction Steps
1. Run `node test-v9-kubernetes-java.js` or `node test-v9-simple.js`
2. Observe repository cloning succeeds
3. Tool execution reports "0 files found" in repository
4. Tools fail to analyze because no files are discoverable

## 🐛 Error Messages
```
Repository cloned successfully
✅ Cloning completed
❌ Files found: 0
Tool execution failed: No files to analyze
```

## 🔧 Technical Details

### Container Environment
- **Namespace**: codequal-dev
- **Mount Point**: /workspace/repo
- **Image**: analyzer:lang-java-v5.1 (and other lang variants)
- **Registry**: registry.digitalocean.com/codequal-registry

### File Locations
- **Repository Manager**: `/packages/agents/src/two-branch/utils/kubernetes-repository-manager.ts`
- **Tool Orchestrator**: `/packages/agents/src/two-branch/analyzers/v9-tool-orchestrator.ts`
- **Test Files**: Various `test-v9-*.js` files in project root

### What Works
- ✅ Kubernetes connection established
- ✅ Container images pull successfully
- ✅ Repository cloning process completes
- ✅ Git operations appear successful

### What Fails
- ❌ File enumeration in /workspace/repo
- ❌ Directory listing returns empty
- ❌ Tool execution cannot access files

## 🔍 Investigation Areas

### 1. Mount Point Issues
- Verify /workspace/repo directory exists in container
- Check if mount point is correctly configured
- Investigate volume mount permissions

### 2. File Permissions
- Check if cloned files have correct ownership
- Verify container user can read repository files
- Investigate security context restrictions

### 3. Git Clone Location
- Verify git clone target directory is correct
- Check if files are cloned to expected location
- Investigate git working directory configuration

### 4. Container Working Directory
- Verify container starts in correct directory
- Check if path resolution is working
- Investigate relative vs absolute path issues

## 🔧 Proposed Investigation Steps

### Phase 1: Basic Verification
```bash
# Test container file system access
kubectl exec -n codequal-dev <pod-name> -- ls -la /workspace/
kubectl exec -n codequal-dev <pod-name> -- ls -la /workspace/repo/
```

### Phase 2: Git Clone Verification
```bash
# Test git operations in container
kubectl exec -n codequal-dev <pod-name> -- git clone <repo-url> /tmp/test-clone
kubectl exec -n codequal-dev <pod-name> -- ls -la /tmp/test-clone/
```

### Phase 3: Permission Investigation
```bash
# Check permissions and ownership
kubectl exec -n codequal-dev <pod-name> -- whoami
kubectl exec -n codequal-dev <pod-name> -- pwd
kubectl exec -n codequal-dev <pod-name> -- env | grep -i workspace
```

## 💡 Potential Solutions

### 1. Fix Mount Configuration
- Ensure proper volume mount in Kubernetes job spec
- Verify mount path consistency between clone and enumeration

### 2. Adjust File Permissions
- Set correct ownership after git clone
- Configure security context in pod spec

### 3. Update Working Directory
- Ensure container starts in correct directory
- Fix path resolution in file enumeration code

### 4. Debug Container State
- Add logging to show actual file system state
- Verify container file system is as expected

## 🔗 Related Files
- `/packages/agents/src/two-branch/utils/kubernetes-repository-manager.ts:125-150` (git clone logic)
- `/packages/agents/src/two-branch/analyzers/v9-tool-orchestrator.ts:180-220` (file enumeration)
- Various Kubernetes job specifications for tool containers

## 📊 Impact
- **Tool Execution**: 100% blocked - no files accessible
- **Pipeline**: Complete failure after repository cloning
- **Development**: Testing and debugging significantly hindered
- **Production**: Would prevent any real analysis

## 🚨 Priority Justification
This is a HIGH priority issue because:
1. Blocks all tool execution despite successful infrastructure setup
2. Prevents end-to-end testing of V9 pipeline
3. Makes 95% of V9 functionality unusable
4. Requires immediate resolution for system to be operational

## 📝 Next Session Actions
1. **Immediate**: Debug container file system state
2. **Investigate**: Mount point and permissions
3. **Test**: Manual file operations in container
4. **Fix**: Implement solution based on findings
5. **Verify**: End-to-end tool execution works

## 🔧 Debug Commands for Next Session
```bash
# Check container state
kubectl get pods -n codequal-dev
kubectl logs -n codequal-dev <pod-name>

# Exec into container
kubectl exec -it -n codequal-dev <pod-name> -- /bin/bash

# Test file operations
ls -la /workspace/
find /workspace/ -type f | head -20
git status (if in a git repo)
```