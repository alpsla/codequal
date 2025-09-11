#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ftjhmbbcuqjqmmbaymqb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0amhtYmJjdXFqcW1tYmF5bXFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODg1OTczNCwiZXhwIjoyMDU0NDM1NzM0fQ.ldT_p0Xn64S3OM5AR27-Iht27nUkbR9kGDyaJftPt-s';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkGitLabOAuth() {
  console.log('Checking GitLab OAuth configuration...\n');
  
  try {
    // Test OAuth with GitLab
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'gitlab',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
        scopes: 'read_user',
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('GitLab OAuth Error:', error);
      console.log('\nPossible issues:');
      console.log('1. Redirect URLs not configured in Supabase Dashboard');
      console.log('2. GitLab OAuth app callback URL mismatch');
      console.log('3. Supabase URL configuration issue\n');
      
      console.log('Required Supabase Dashboard Settings:');
      console.log('- Site URL: http://localhost:3000');
      console.log('- Redirect URLs:');
      console.log('  - http://localhost:3000/auth/callback');
      console.log('  - http://localhost:3000/**');
      
      console.log('\nRequired GitLab OAuth App Settings:');
      console.log('- Callback URL: https://ftjhmbbcuqjqmmbaymqb.supabase.co/auth/v1/callback');
      console.log('  (No trailing slash!)');
    } else {
      console.log('GitLab OAuth URL generated successfully:', data.url);
      console.log('\nOAuth configuration appears to be correct!');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkGitLabOAuth();