# Quick Start Guide: Next Session
**Previous Session:** August 31, 2025  
**Focus for Next Session:** Complete tool installation and execute real vulnerability testing

## 🚀 Quick Resume Commands

```bash
# 1. Set environment variables
export DROPLET_IP=157.230.9.119
export DROPLET_USER=root

# 2. Test connection (should work immediately)
ssh root@$DROPLET_IP "echo '✅ Connected'"

# 3. Navigate to project
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# 4. View last session status
cat src/two-branch/test-results/reports/demo_20250831_161436.md
```

## 📌 Current Status

### ✅ Completed
- All unit tests passing (120/120)
- ToolAvailabilityManager preventing silent failures
- Test infrastructure created
- Redis droplet accessible (157.230.9.119)
- Partial tool installation complete

### ⚠️ In Progress
- Security tool installation on droplet (60% complete)
- Missing tools: Go (gosec, staticcheck), Ruby (Brakeman, RuboCop)

### 🔴 Pending
- Complete tool installation
- Run real vulnerability tests
- Generate comprehensive reports
- Update master coverage matrix

## 📋 Immediate Next Steps

### Step 1: Complete Tool Installation (15 minutes)

```bash
# SSH to droplet
ssh root@157.230.9.119

# Install missing Go tools
export PATH=/usr/local/go/bin:/root/go/bin:$PATH
go install github.com/securego/gosec/v2/cmd/gosec@latest
go install honnef.co/go/tools/cmd/staticcheck@latest

# Install missing Ruby tools
gem install brakeman rubocop --no-document

# Verify all tools
/root/go/bin/gosec -version
/root/go/bin/staticcheck -version
brakeman --version
rubocop --version
```

### Step 2: Run Security Tests (30 minutes)

```bash
# From local machine
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Execute test suite on droplet
./scripts/deploy-with-tracking.sh

# Or run directly on droplet
ssh root@157.230.9.119 "cd /opt && bash run-real-tool-tests.sh"
```

### Step 3: Generate Reports (10 minutes)

```bash
# View test results
./scripts/view-test-results.sh

# Check coverage matrix
cat src/two-branch/test-results/matrices/master-coverage-matrix.md

# Review latest session
ls -la src/two-branch/test-results/sessions/
```

## 🎯 Priority Tasks

### 1. Critical - Complete Tool Installation
**Why:** Can't test without tools  
**Files:** 
- `scripts/install-security-tools.sh`
- `scripts/install-missing-tools.sh`

**Quick Check:**
```bash
ssh root@157.230.9.119 "./check-tools-status.sh"
```

### 2. High - Execute Real Tests
**Why:** Validate detection capabilities  
**Files:**
- `scripts/run-real-tool-tests.sh`
- `src/two-branch/test-results/`

**Test Command:**
```bash
npm test src/two-branch/tests/integration/real-tools-integration.test.ts
```

### 3. High - Update Coverage Matrix
**Why:** Track progress and gaps  
**File:** `src/two-branch/test-results/matrices/master-coverage-matrix.md`

**Update Command:**
```bash
node scripts/update-coverage-matrix.js
```

## 🔍 Validation Checklist

### Tool Installation Verification
```bash
# Run this to verify all tools are installed
ssh root@157.230.9.119 << 'EOF'
echo "Checking security tools..."
tools=(
  "bandit" "pylint" "gosec" "staticcheck"
  "brakeman" "rubocop" "cppcheck" "clang-tidy"
  "eslint" "semgrep" "spotbugs" "pmd"
)
for tool in "${tools[@]}"; do
  if command -v $tool &> /dev/null || [ -f /opt/${tool}* ]; then
    echo "✅ $tool"
  else
    echo "❌ $tool missing"
  fi
done
EOF
```

### Test Execution Verification
```bash
# Verify test repos exist
ssh root@157.230.9.119 "ls -la /opt/test-repos/"

# Check for vulnerabilities in test code
ssh root@157.230.9.119 "grep -r 'SQL injection' /opt/test-repos/"
```

## 📊 Expected Outcomes

### After Tool Installation
- All 25 security tools installed and accessible
- Tools responding to version checks
- PATH correctly configured for Go and Ruby tools

### After Test Execution
- 200+ vulnerabilities detected across test repositories
- Performance metrics for each tool
- Markdown reports in `test-results/reports/`
- Updated coverage matrix showing 100% tool coverage

### Success Criteria
- [ ] All tools installed (25/25)
- [ ] All test repos created (8/8 languages)
- [ ] Tests executed without errors
- [ ] Reports generated with metrics
- [ ] Coverage matrix updated
- [ ] No silent failures (ToolMode.STRICT working)

## 🐛 Common Issues & Solutions

### Issue 1: Go tools not in PATH
```bash
# Fix:
echo 'export PATH=/usr/local/go/bin:/root/go/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Issue 2: Ruby gems permission error
```bash
# Fix:
sudo gem install brakeman rubocop --no-document
```

### Issue 3: SSH connection timeout
```bash
# Fix: Use existing connection
ssh -o ServerAliveInterval=60 root@157.230.9.119
```

### Issue 4: Tool execution fails
```bash
# Debug with verbose mode
TOOL_MODE=degraded npm test -- --verbose
```

## 🔗 Key Files Quick Reference

### Configuration
- **Tool Manager:** `src/two-branch/agents/ToolAvailabilityManager.ts`
- **Agent Registry:** `src/two-branch/agents/index.ts`
- **Test Config:** `src/two-branch/jest.config.js`

### Scripts
- **Install Tools:** `scripts/install-security-tools.sh`
- **Run Tests:** `scripts/run-real-tool-tests.sh`
- **Deploy:** `scripts/deploy-with-tracking.sh`
- **View Results:** `scripts/view-test-results.sh`

### Test Data
- **Test Repos:** `/opt/test-repos/` (on droplet)
- **Results:** `src/two-branch/test-results/`
- **Reports:** `src/two-branch/test-results/reports/`
- **Matrices:** `src/two-branch/test-results/matrices/`

## 💡 Pro Tips

1. **Use screen/tmux** for long-running commands on droplet
2. **Check disk space** before large test runs: `df -h`
3. **Monitor tool execution** with: `htop` on droplet
4. **Backup results** before new test runs
5. **Use TOOL_MODE=mock** for quick local testing only

## 📝 Environment Variables

```bash
# Add to .env or export manually
export DROPLET_IP=157.230.9.119
export DROPLET_USER=root
export TOOL_MODE=strict        # For production testing
export MONITORING_ENABLED=true
export REPORT_FORMAT=markdown
export REDIS_URL=redis://157.230.9.119:6379
```

## 🎯 Session Goals

### Primary Objectives
1. ✅ Complete all tool installations
2. ✅ Execute comprehensive security tests
3. ✅ Achieve 100% tool coverage
4. ✅ Generate performance benchmarks
5. ✅ Update all tracking matrices

### Stretch Goals
- Optimize slow-performing tools
- Add parallel execution support
- Create CI/CD pipeline integration
- Document tool configuration best practices

## 📅 Estimated Timeline

- **Tool Installation:** 15 minutes
- **Test Execution:** 30 minutes  
- **Report Generation:** 10 minutes
- **Review & Analysis:** 15 minutes
- **Total:** ~70 minutes

## 🚦 Ready Check

Before starting:
- [ ] Droplet is accessible
- [ ] Previous session notes reviewed
- [ ] Environment variables set
- [ ] Project directory ready
- [ ] Network connection stable

## 🔄 Quick Recovery

If session interrupted:
```bash
# Restore state
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
source droplet-config.env
./scripts/resume-testing.sh
```

---

**Ready to continue!** Start with Step 1: Complete Tool Installation.

**Questions?** Check previous session: `SESSION_STATUS_2025_08_31.md`