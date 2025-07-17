#!/usr/bin/env node

/**
 * Check Researcher Agent Scheduler Status
 */

console.log('\n🔍 Researcher Agent Scheduler Status\n');
console.log('==========================================\n');

// 1. Schedule Information
console.log('📅 Schedule Configuration:');
console.log('  Frequency: Quarterly (every 3 months)');
console.log('  Schedule: 9 AM UTC on the 5th day of every 3rd month');
console.log('  Cron Expression: 0 9 5 */3 *');
console.log('  Pattern: Sep 5, Dec 5, Mar 5, Jun 5\n');

// 2. Calculate next runs
const currentDate = new Date();
const quarterlyDates = [
  { month: 2, day: 5, label: 'Mar 5' },  // March (0-indexed = 2)
  { month: 5, day: 5, label: 'Jun 5' },  // June
  { month: 8, day: 5, label: 'Sep 5' },  // September
  { month: 11, day: 5, label: 'Dec 5' }  // December
];

console.log('📆 Next Scheduled Runs:');
const nextRuns = [];
const currentYear = currentDate.getFullYear();

// Check this year and next 2 years
for (let yearOffset = 0; yearOffset <= 2 && nextRuns.length < 4; yearOffset++) {
  const year = currentYear + yearOffset;
  
  for (const quarter of quarterlyDates) {
    if (nextRuns.length >= 4) break;
    
    const runDate = new Date(year, quarter.month, quarter.day, 9, 0, 0); // 9 AM UTC
    
    if (runDate > currentDate) {
      nextRuns.push({
        date: runDate,
        label: `${quarter.label}, ${year}`
      });
    }
  }
}

nextRuns.forEach((run, index) => {
  const daysUntil = Math.ceil((run.date - currentDate) / (1000 * 60 * 60 * 24));
  console.log(`  ${index + 1}. ${run.label} at 9:00 AM UTC (in ${daysUntil} days)`);
});

// 3. Current Status
console.log('\n📊 Current Status:');
console.log(`  Current Date: ${currentDate.toUTCString()}`);
console.log(`  Next Run: ${nextRuns[0]?.label || 'Unknown'} at 9:00 AM UTC`);

// 4. What happens during quarterly run
console.log('\n🔄 Quarterly Research Process:');
console.log('  1. Dynamic Researcher Discovery');
console.log('     - Finds the best researcher model');
console.log('     - Tests various models for research capability');
console.log('  2. 10-minute delay');
console.log('  3. Comprehensive Configuration Population');
console.log('     - Updates all 2,079 context combinations');
console.log('     - Language × Size × Role configurations');
console.log('     - Stores primary and fallback models');

// 5. Manual trigger information
console.log('\n🔧 Manual Trigger:');
console.log('  To run immediately: npx ts-node scripts/quarterly-researcher-scheduler.ts --manual');
console.log('  To check logs: tail -f logs/quarterly-researcher.log');

// 6. Environment variables
console.log('\n⚙️  Environment Variables:');
console.log('  QUARTERLY_SCHEDULER_ENABLED: Controls if scheduler is active (default: true)');
console.log('  QUARTERLY_SCHEDULER_TIMEZONE: Timezone for scheduling (default: UTC)');

// 7. How to check if it's running
console.log('\n🏃 To Check if Scheduler is Running:');
console.log('  1. Check for node process: ps aux | grep quarterly-researcher-scheduler');
console.log('  2. Check logs: tail -f logs/quarterly-researcher.log');
console.log('  3. Use API: GET /api/researcher/status');

console.log('\n✅ Schedule check completed\n');