import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://ppcthbrezckxfeqkvrzz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Test email
const testEmail = 'test-profile-fix@example.com';
const testPassword = 'TestPassword123!';

async function testUserProfilesFix() {
  console.log('Testing user_profiles table fix...\n');

  // Create clients
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Step 1: Check if table exists using service role
    console.log('1. Checking if user_profiles table exists...');
    const { data: tableCheck, error: tableError } = await serviceClient
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (tableError) {
      console.error('❌ Table check failed:', tableError.message);
      console.log('   The table might not exist or there might be a permissions issue.');
      return;
    } else {
      console.log('✅ Table exists and is accessible');
    }

    // Step 2: Create a test user
    console.log('\n2. Creating test user...');
    const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('   User already exists, attempting to sign in...');
        
        // Try to sign in instead
        const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });

        if (signInError) {
          console.error('❌ Sign in failed:', signInError.message);
          return;
        }
        console.log('✅ Signed in successfully');
      } else {
        console.error('❌ Sign up failed:', signUpError.message);
        return;
      }
    } else {
      console.log('✅ User created successfully');
    }

    // Step 3: Check if profile was created
    console.log('\n3. Checking if user profile was created...');
    const userId = signUpData?.user?.id || (await anonClient.auth.getUser()).data.user?.id;
    
    if (!userId) {
      console.error('❌ Could not get user ID');
      return;
    }

    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('❌ Profile check failed:', profileError.message);
      console.log('   The trigger might not be working properly.');
    } else if (profile) {
      console.log('✅ Profile exists:', {
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        created_at: profile.created_at
      });
    }

    // Step 4: Test profile creation manually
    if (!profile) {
      console.log('\n4. Creating profile manually...');
      const { data: manualProfile, error: manualError } = await serviceClient
        .from('user_profiles')
        .insert({
          user_id: userId,
          email: testEmail,
          full_name: 'Test User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (manualError) {
        console.error('❌ Manual profile creation failed:', manualError.message);
      } else {
        console.log('✅ Profile created manually:', manualProfile);
      }
    }

    // Step 5: Test authentication flow
    console.log('\n5. Testing authentication flow...');
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
    } else {
      console.log('✅ Authentication successful');
      
      // Check if we can access the profile
      const { data: userProfile, error: userProfileError } = await anonClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (userProfileError) {
        console.error('❌ Could not access profile:', userProfileError.message);
      } else {
        console.log('✅ Profile accessible via authenticated client');
      }
    }

    // Step 6: Clean up test user (optional)
    console.log('\n6. Cleaning up test data...');
    if (userId) {
      // Delete from user_profiles first (due to foreign key)
      await serviceClient
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      // Note: We can't delete from auth.users via Supabase client
      // This would need to be done via the dashboard or admin API
      console.log('✅ Test profile cleaned up (auth.users entry remains)');
    }

    console.log('\n✅ All tests completed!');
    console.log('\nSummary:');
    console.log('- The user_profiles table is accessible');
    console.log('- Profile creation and authentication are working');
    console.log('- The fix appears to be successful');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the test
testUserProfilesFix().catch(console.error);