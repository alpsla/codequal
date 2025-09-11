/**
 * This file tests if the AgentRole import works correctly
 */

import { AgentRole } from '@codequal/core/config/agent-registry';

console.log('Available Agent Roles:');
for (const role of Object.values(AgentRole)) {
  console.log(`- ${role}`);
}
