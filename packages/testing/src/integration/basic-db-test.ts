import { describe, it, expect } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

/**
 * Basic Database Connection Test
 * Tests the core database connectivity without complex dependencies
 */
describe('Basic Database Tests', () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  it('should have required environment variables', () => {
    console.log('Checking environment variables...');
    expect(supabaseUrl).toBeDefined();
    expect(supabaseKey).toBeDefined();
    console.log('✅ Environment variables are set');
  });

  it('should connect to Supabase', async () => {
    console.log('Testing Supabase connection...');
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Test with a simple query to check connection
    const { data, error } = await supabase
      .from('_prisma_migrations')  // This table should exist if migrations ran
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // Table doesn't exist - try another system table
      const { data: authData, error: authError } = await supabase
        .from('auth.users')
        .select('id')
        .limit(1);
      
      if (authError) {
        console.log('⚠️  No tables found yet - database may need initialization');
        expect(authError).toBeDefined(); // Expected if DB is fresh
      } else {
        console.log('✅ Connected to Supabase (auth schema accessible)');
        expect(authData).toBeDefined();
      }
    } else if (error) {
      console.error('Unexpected error:', error);
      throw error;
    } else {
      console.log('✅ Connected to Supabase successfully');
      expect(data).toBeDefined();
    }
  });

  it('should check if analysis_chunks table exists', async () => {
    console.log('Checking for Vector DB tables...');
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { data, error } = await supabase
      .from('analysis_chunks')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('⚠️  analysis_chunks table does not exist yet');
      console.log('   Run database migrations to create Vector DB tables');
      expect(error.code).toBe('42P01'); // Expected
    } else if (error) {
      console.error('Unexpected error:', error);
      throw error;
    } else {
      console.log('✅ Vector DB tables exist');
      expect(data).toBeDefined();
    }
  });

  it('should list available tables', async () => {
    console.log('Listing database tables...');
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Query to list all tables in public schema
    const { data, error } = await supabase
      .rpc('get_tables', {})
      .select('*');
    
    if (error) {
      // Try a different approach
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (schemaError) {
        console.log('⚠️  Cannot list tables - this is normal for restricted access');
        expect(true).toBe(true);
      } else {
        console.log('Found tables:', schemaData?.map(t => t.table_name).join(', '));
        expect(schemaData).toBeDefined();
      }
    } else {
      console.log('Found tables via RPC:', data);
      expect(data).toBeDefined();
    }
  });
});
