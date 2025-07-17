#!/usr/bin/env ts-node

async function testMCPSimple() {
  console.log('=== Simple MCP Tools Test ===\n');
  
  try {
    console.log('Importing MCP-Hybrid package...');
    const mcpHybrid = await import('@codequal/mcp-hybrid');
    console.log('Available exports:', Object.keys(mcpHybrid));
    
    console.log('\nInitializing tools...');
    if (mcpHybrid.initializeTools) {
      await mcpHybrid.initializeTools();
      console.log('✓ Tools initialized successfully');
    } else {
      console.log('✗ initializeTools not found');
    }
    
    console.log('\nChecking tool registry...');
    if (mcpHybrid.toolRegistry) {
      console.log('✓ Tool registry available');
      // Try to get all tools
      const allTools = mcpHybrid.toolRegistry.getAllTools();
      console.log('Total tools registered:', allTools.length);
      console.log('Tool names:', allTools.map((t: any) => t.name || t.id).slice(0, 10));
    } else {
      console.log('✗ Tool registry not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMCPSimple().catch(console.error);