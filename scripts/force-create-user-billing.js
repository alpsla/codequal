const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function forceCreateUserBilling() {
  const userId = '7dcd7c31-ccc1-4479-889a-ad52d69e5a56';
  const userEmail = 'tester3@grr.la';
  
  try {
    console.log(`Attempting to create/update user_billing for user ${userId}...`);
    
    // First, check if user_billing already exists
    const { data: existing, error: checkError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existing) {
      console.log('User billing already exists:', existing);
      
      // Run sync to update from Stripe
      console.log('\nRunning Stripe sync...');
      require('child_process').execSync(`node scripts/sync-stripe-subscription.js ${userEmail}`, { stdio: 'inherit' });
      
    } else {
      console.log('No existing billing record found.');
      
      // Force create the user_billing record
      const { data: newBilling, error: insertError } = await supabase
        .from('user_billing')
        .insert({
          user_id: userId,
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating user_billing:', insertError);
        
        // If foreign key constraint fails, the user doesn't exist
        if (insertError.code === '23503') {
          console.error('\nERROR: User does not exist in auth.users table.');
          console.error('The user must be created through the signup process first.');
          
          // Try to find similar users
          console.log('\nSearching for similar email addresses...');
          const { data: users } = await supabase
            .from('users')
            .select('id, email')
            .ilike('email', '%tester%');
          
          if (users && users.length > 0) {
            console.log('\nFound similar users:');
            users.forEach(u => console.log(`- ${u.id}: ${u.email}`));
          }
        }
      } else {
        console.log('Successfully created user_billing:', newBilling);
        
        // Run sync to update from Stripe
        console.log('\nRunning Stripe sync...');
        require('child_process').execSync(`node scripts/sync-stripe-subscription.js ${userEmail}`, { stdio: 'inherit' });
      }
    }
    
    // Final check
    console.log('\nFinal check...');
    const { data: final } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (final) {
      console.log('Final user_billing state:', final);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

forceCreateUserBilling().then(() => process.exit(0));