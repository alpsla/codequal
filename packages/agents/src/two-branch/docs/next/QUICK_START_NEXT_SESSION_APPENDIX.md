# NEXT SESSION APPENDIX - Quick Reference

## 📁 Key Files & Locations

### Test Framework
```
packages/agents/src/two-branch/tests/
├── full-workflow-v8-integration.ts    # Main test runner
├── enhanced-report-generator.ts       # V8 report logic
└── enhanced-markdown-generator.ts     # Markdown formatting

packages/agents/test-reports/
└── 2025-09-06/                       # Today's test results
    └── <session-id>/
        ├── java-full-report-*.json   # JSON report
        └── java-full-report-*.md     # Markdown report
```

### Container Definitions
```
docker/languages/
├── Dockerfile.python.v4         # Python container
├── Dockerfile.java.v4.final     # Java container (with JaCoCo fix)
├── Dockerfile.rust.v4.fixed     # Rust container (with cargo fixes)
└── ...                          # Other language containers

kubernetes/
├── kaniko-build-java-rust-final.yaml  # Build job definitions
└── language-deployments.yaml          # Pod deployments
```

## 🔍 Troubleshooting Guide

### Issue: Test Timeout
```bash
# Increase timeout in test
npx ts-node src/two-branch/tests/full-workflow-v8-integration.ts python

# Or modify the test file timeout
# Line ~300: timeout: 180000  # 3 minutes
```

### Issue: No Code Snippets in Report
```bash
# Check Redis is running
redis-cli ping

# Check cached files
redis-cli keys "repo:*"

# Clear cache if needed
redis-cli flushall
```

### Issue: Model Configuration Error
```bash
# Check Supabase connection
npx ts-node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('deepwiki_configurations').select('*').then(r => console.log(JSON.stringify(r.data, null, 2)));
"
```

### Issue: Container Not Found
```bash
# Check pod status
kubectl get pods -n codequal-dev

# Check specific language
kubectl get pods -n codequal-dev -l language=python

# View pod logs
kubectl logs -n codequal-dev <pod-name>
```

## 📊 Expected Test Results

### Successful Test Output:
```
✅ Redis connected
✅ Supabase connected successfully
✅ Enhanced report generator initialized

🚀 FULL WORKFLOW TEST: PYTHON
📦 Repository: <test-repo>
🔄 PR Number: #1
...
📊 STEP 8: Generating Final Report...
   Generating enhanced V8 report with all components...
   ✅ Enhanced report generated successfully

📁 Reports saved:
   • JSON: /path/to/report.json
   • Markdown: /path/to/report.md

📊 FINAL REPORT SUMMARY
🏆 OVERALL SCORE: XX/100 (Grade: X)
📋 DECISION: APPROVED/REJECTED
```

## 🎯 Test Coverage Checklist

For each language, verify:

- [ ] Container responds to health check
- [ ] Tools execute without errors
- [ ] Real issues are detected (not mock)
- [ ] Code snippets appear in report
- [ ] Decision logic works (REJECT if critical)
- [ ] Business impact calculated
- [ ] Skills tracking shows changes
- [ ] Education insights populated
- [ ] Report saves to correct location
- [ ] Markdown formatting is correct

## 🚨 Critical Configuration

### Environment Variables (.env)
```bash
SUPABASE_URL=https://ftjhmbbcuqjqmmbaymqb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-key>
REDIS_URL=redis://localhost:6379
```

### Model Configuration (Supabase)
```sql
-- Check current config
SELECT * FROM deepwiki_configurations 
WHERE config_type = 'global' 
ORDER BY created_at DESC 
LIMIT 1;

-- Should show:
-- primary_model: anthropic/claude-opus-4-1-20250805
-- fallback_model: google/gemini-2.5-flash-20250720
```

## 📈 Progress Tracking

### Completed ✅
- [x] Java container fixed (JaCoCo issue)
- [x] Rust container fixes applied
- [x] V8 report structure complete
- [x] Java integration tested
- [x] Documentation updated
- [x] Test folder cleaned

### In Progress 🔧
- [ ] Rust container build completion
- [ ] Python integration test
- [ ] JavaScript integration test

### TODO 📋
- [ ] Test remaining 7 languages
- [ ] Production deployment prep
- [ ] Performance optimization
- [ ] Monitoring setup

## 💡 Quick Wins for Next Session

1. **Parallel Testing**: Run multiple language tests simultaneously
```bash
# In separate terminals
npx ts-node src/two-branch/tests/full-workflow-v8-integration.ts python &
npx ts-node src/two-branch/tests/full-workflow-v8-integration.ts javascript &
```

2. **Batch Report Review**: Check all reports at once
```bash
# View all reports from today
ls -la test-reports/$(date +%Y-%m-%d)/*/
```

3. **Quick Health Check**: Verify all containers
```bash
for lang in python javascript java go ruby php cpp csharp perl rust; do
  echo "Checking $lang..."
  kubectl get pods -n codequal-dev -l language=$lang --no-headers | wc -l
done
```

## 🎯 Definition of Done

The system is ready for production when:

1. **All 10 languages tested** with V8 reports
2. **No critical bugs** in test results
3. **Performance < 30s** for small repos
4. **Documentation complete** for operations team
5. **Monitoring configured** for production
6. **Runbook created** for common issues

## 📝 Notes from This Session

- **Rust Build Time**: Expect 60-90 minutes due to cargo compilation
- **Java Success**: V8 reports working perfectly with all components
- **Code Snippets**: Redis caching working, files stored with session ID
- **Model Config**: Using Supabase exclusively, no hardcoded models
- **Report Quality**: All V8 components present and functional

---

**Session End Time**: September 6, 2025
**Context Used**: ~90%
**Next Session ETA**: 2-3 hours for full testing
**Contact**: Check #codequal-dev Slack channel for updates