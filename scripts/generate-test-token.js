require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY  // Use anon key for auth
);

async function generateTestToken() {
  console.log('\n=== Generating Test Token ===\n');

  try {
    // Sign in with a test user or create one
    const email = 'test@example.com';
    const password = 'TestPassword123!';
    
    // Try to sign in first
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      console.log('Sign in failed, trying to create user...');
      
      // Try to sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (signUpError) {
        console.error('Failed to create user:', signUpError);
        return;
      }
      
      signInData = signUpData;
    }
    
    if (signInData && signInData.session) {
      console.log('✅ Authentication successful!\n');
      console.log('Access Token:', signInData.session.access_token);
      console.log('\nToken expires at:', new Date(signInData.session.expires_at * 1000).toLocaleString());
      console.log('\n📋 Copy this token and use it in your browser console:');
      console.log(`\nlocalStorage.setItem('access_token', '${signInData.session.access_token}');\n`);
      
      // Also save user info
      if (signInData.user) {
        console.log('User ID:', signInData.user.id);
        console.log('Email:', signInData.user.email);
      }
    } else {
      console.error('No session data received');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

generateTestToken().then(() => process.exit(0));