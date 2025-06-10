import { createClient } from '@supabase/supabase-js';

describe('Minimal Integration Test', () => {
  it('should connect to Supabase', async () => {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    expect(supabaseUrl).toBeTruthy();
    expect(supabaseKey).toBeTruthy();
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Try a simple query
      const { data, error } = await supabase
        .from('repositories')
        .select('id')
        .limit(1);
      
      expect(error).toBeNull();
      console.log('Supabase connection successful');
    }
  });

  it('should have environment variables', () => {
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
  });

  it('should load core module', () => {
    // Use require to test runtime loading
    const core = require('../../../packages/core/dist/index.js');
    expect(core).toBeDefined();
    expect(core.logging).toBeDefined();
  });

  it('should load agents module', () => {
    // Use require to test runtime loading
    const agents = require('../../../packages/agents/dist/index.js');
    expect(agents).toBeDefined();
    
    // Log what's actually exported
    console.log('Agents exports:', Object.keys(agents));
  });
});
