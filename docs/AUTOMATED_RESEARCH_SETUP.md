# Automated Research Setup

## Overview

The CodeQual Researcher can run automatically every 3 months without requiring user authentication. This ensures your AI model configurations stay up-to-date with the latest models.

## How It Works

1. **System Authentication**: Uses a system user account instead of requiring JWT tokens
2. **Cron/Systemd**: Runs via system schedulers (cron or systemd timers)
3. **Quarterly Schedule**: Executes on the 1st day of Jan, Apr, Jul, Oct at 0 AM ET (5 AM UTC)
4. **Self-Maintaining**: Discovers new models automatically without code changes

## Setup Methods

### Method 1: Using Cron (Recommended for most systems)

1. **Set Environment Variable**:
   ```bash
   export OPENROUTER_API_KEY="your-openrouter-api-key"
   ```

2. **Add to Crontab**:
   ```bash
   # Edit crontab
   crontab -e
   
   # Add this line (adjust path as needed):
   0 5 1 */3 * OPENROUTER_API_KEY=your-key /path/to/codequal/scripts/run-scheduled-research.sh >> /var/log/codequal-research.log 2>&1
   ```

3. **Verify Cron Entry**:
   ```bash
   crontab -l
   ```

### Method 2: Using Systemd (For Linux systems)

1. **Copy Service Files**:
   ```bash
   sudo cp scripts/codequal-research.service /etc/systemd/system/
   sudo cp scripts/codequal-research.timer /etc/systemd/system/
   ```

2. **Configure API Key**:
   ```bash
   # Edit the service file
   sudo systemctl edit codequal-research.service
   
   # Add your API key:
   [Service]
   Environment="OPENROUTER_API_KEY=your-key"
   ```

3. **Enable and Start Timer**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable codequal-research.timer
   sudo systemctl start codequal-research.timer
   ```

4. **Check Status**:
   ```bash
   sudo systemctl status codequal-research.timer
   sudo systemctl list-timers
   ```

### Method 3: Manual Trigger (For testing)

Run the research immediately without authentication:

```bash
cd /path/to/codequal
OPENROUTER_API_KEY=your-key npx tsx packages/agents/src/researcher/scheduled-research-runner.ts
```

## What Happens During Automated Research

1. **Model Discovery**: Fetches all available models from OpenRouter
2. **Dynamic Evaluation**: Evaluates models based on patterns (no hardcoded names)
3. **Role-Specific Selection**: Picks optimal models for each of the 10 agent roles
4. **Configuration Update**: Stores new configurations in Vector DB
5. **Logging**: Records results for monitoring

## Example Output

```
=========================================
SCHEDULED RESEARCH RUN
Time: Mon Jan 01 2025 09:00:00 GMT+0000 (UTC)
=========================================
Starting scheduled research...
[INFO] [ScheduledResearchRunner] === SCHEDULED QUARTERLY RESEARCH STARTING ===
[INFO] [ScheduledResearchRunner] Running as: SYSTEM USER (no authentication required)
[INFO] [ProductionResearcherService] Fetched 319 models from OpenRouter
[INFO] [ProductionResearcherService] Evaluated 319 models with dynamic scoring
[INFO] [ProductionResearcherService] AI selected configuration for deepwiki
  Primary: google/gemini-2.5-flash
  Fallback: google/gemini-2.5-pro
...
[INFO] [ScheduledResearchRunner] ✅ Scheduled research completed successfully
  Next scheduled run: 2025-04-01T09:00:00.000Z
=========================================
```

## Monitoring

Check logs for research runs:

```bash
# Cron logs
tail -f /var/log/codequal-research.log

# Systemd logs
sudo journalctl -u codequal-research.service -f
```

## Troubleshooting

1. **Missing API Key**: Ensure OPENROUTER_API_KEY is set in environment
2. **Permission Issues**: Make sure the script is executable: `chmod +x scripts/run-scheduled-research.sh`
3. **Path Issues**: Use absolute paths in cron jobs
4. **Time Zone**: The schedule uses UTC time (5 AM UTC = 0 AM ET)

## Benefits

- **No Authentication Required**: Runs as system user
- **Automatic Updates**: Keeps model configurations current
- **Self-Maintaining**: Discovers new models without code changes
- **Reliable**: Uses system schedulers for guaranteed execution
- **Monitored**: All runs are logged for tracking