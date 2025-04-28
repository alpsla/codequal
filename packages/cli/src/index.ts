#!/usr/bin/env node
import { Command } from 'commander';
import { version } from './version';
import { runPRReview } from './commands/pr-review';

const program = new Command();

program
  .name('codequal')
  .description('CodeQual PR review tool')
  .version(version);

program
  .command('review')
  .description('Run a PR review')
  .option('-r, --repo <repo>', 'Repository name (owner/repo)')
  .option('-p, --pr <number>', 'PR number')
  .option('-t, --token <token>', 'GitHub token')
  .option('--snyk-token <token>', 'Snyk API token (optional)')
  .action(runPRReview);

// Pass process.argv to parse() method
program.parse(process.argv);
