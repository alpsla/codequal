const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAuthUsers() {
  const userId = '7dcd7c31-ccc1-4479-889a-ad52d69e5a56';
  const userEmail = 'tester3@grr.la';
  
  try {
    // Check auth.users table directly
    console.log('Checking auth.users table...');
    
    // First try by ID using service role
    const { data: authUserById, error: authByIdError } = await supabase.auth.admin.getUserById(userId);
    
    if (authUserById && authUserById.user) {
      console.log(`\nFound user in auth.users by ID:`);
      console.log(`- ID: ${authUserById.user.id}`);
      console.log(`- Email: ${authUserById.user.email}`);
      console.log(`- Created at: ${authUserById.user.created_at}`);
      console.log(`- Confirmed at: ${authUserById.user.confirmed_at}`);
      
      // Create user_billing record
      console.log('\nCreating user_billing record...');
      const { data: billing, error: billingError } = await supabase
        .from('user_billing')
        .upsert({
          user_id: authUserById.user.id,
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (billingError) {
        console.error('Error creating user_billing:', billingError);
      } else {
        console.log('User billing record created/updated:', billing);
      }
      
      // Sync with Stripe
      console.log('\nSyncing with Stripe...');
      require('child_process').execSync(`node scripts/sync-stripe-subscription.js ${authUserById.user.email}`, { stdio: 'inherit' });
      
    } else {
      console.log(`User with ID ${userId} not found in auth.users`);
      
      // Try to list users by email
      console.log(`\nSearching for users with email ${userEmail}...`);
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (authUsers && authUsers.users) {
        const matchingUsers = authUsers.users.filter(u => u.email === userEmail);
        
        if (matchingUsers.length > 0) {
          console.log(`\nFound ${matchingUsers.length} user(s) with email ${userEmail}:`);
          matchingUsers.forEach(user => {
            console.log(`- ID: ${user.id}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Created: ${user.created_at}`);
          });
        } else {
          console.log(`No users found with email ${userEmail}`);
        }
      }
    }
    
    // Also check the users table (public schema)
    console.log('\nChecking public.users table...');
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*')
      .or(`id.eq.${userId},email.eq.${userEmail}`);
    
    if (publicUsers && publicUsers.length > 0) {
      console.log(`\nFound ${publicUsers.length} user(s) in public.users:`);
      publicUsers.forEach(user => {
        console.log(`- ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
      });
    } else {
      console.log('No users found in public.users table');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAuthUsers().then(() => process.exit(0));