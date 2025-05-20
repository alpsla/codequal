# May 13, 2025 - Calibration Setup and Execution Plan

## Completed Setup Steps

1. **Fixed Dependency Issues**
   - Added required dependencies to `packages/core/package.json`:
     - axios
     - dotenv

2. **Environment Configuration**
   - Fixed environment variables in `.env`:
     - Added `SUPABASE_SERVICE_KEY` (previously only had SUPABASE_SERVICE_ROLE_KEY)
     - Fixed malformed GITHUB_TOKEN
     - Added DEEPWIKI_API_URL with value `http://localhost:8001`

3. **Directory Preparation**
   - Created `packages/core/scripts/calibration-results` directory for storing calibration results

4. **Documentation Review**
   - Confirmed existing documentation:
     - `/docs/maintenance/full-calibration-process.md`
     - `/docs/maintenance/model-update-process.md`
     - `/docs/maintenance/deepseek-integration-guide.md`

## Next Steps for Calibration

1. **Install Dependencies**
   ```bash
   cd /Users/alpinro/Code\ Prjects/codequal
   npm install --save axios dotenv @supabase/supabase-js
   ```

2. **Start DeepWiki (if not already running)**
   ```bash
   cd /Users/alpinro/Code\ Prjects/deepwiki-open
   docker-compose up -d
   # Or if using Kubernetes
   # kubectl port-forward svc/deepwiki 8001:8001
   ```

3. **Verify Calibration Readiness**
   ```bash
   cd /Users/alpinro/Code\ Prjects/codequal
   node packages/core/scripts/check-calibration-readiness.js
   ```

4. **Run Initial Test (Limited Scope)**
   ```bash
   # Test with a single repository and model first
   node packages/core/scripts/run-comprehensive-calibration.js --single-repo="pallets/flask" --single-model="anthropic/claude-3-7-sonnet"
   ```

5. **Run Full Calibration**
   ```bash
   # Without database update first (to review results)
   node packages/core/scripts/run-comprehensive-calibration.js
   ```

6. **Review Results**
   ```bash
   # Review summary report
   cat packages/core/scripts/calibration-results/summary.md
   
   # Review generated configuration
   cat packages/core/scripts/calibration-results/repository-model-config.ts
   ```

7. **Update Database (After Results Verified)**
   ```bash
   node packages/core/scripts/run-comprehensive-calibration.js --update-db
   ```

8. **Update Configuration Files**
   ```bash
   cp packages/core/scripts/calibration-results/repository-model-config.ts packages/core/src/config/models/
   npm run build:core
   ```

## Calibration Test Schedule

- Initial test will take 5-10 minutes for a single repository and model
- Full calibration across all models and repositories may take several hours
- Progress can be monitored in `calibration-results/calibration-report.json`

## Important Notes

1. **Resource Usage**
   - This process will make many API calls to various model providers
   - Monitor token usage during the process
   - Consider staggered testing if rate limits are a concern

2. **Error Handling**
   - The script includes built-in error handling and will continue despite individual test failures
   - Results are saved incrementally to prevent data loss
   - Check logs regularly for potential issues

3. **Cost Management**
   - API costs will accumulate during the calibration process
   - Set appropriate cost alerts or limits if needed
   - The script uses COST_TRACKING_ENABLED=true from .env

## References

- `full-calibration-process.md` - Detailed guide to the full calibration process
- `model-update-process.md` - Process for updating model versions and recalibration
- `deepseek-integration-guide.md` - Specific guidance for DeepSeek model integration

---

Last Updated: May 13, 2025
