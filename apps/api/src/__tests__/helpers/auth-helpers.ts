import jwt from 'jsonwebtoken';
import { getSupabase } from '@codequal/database/supabase/client';

export async function generateTestToken(userId: string, email: string): Promise<string> {
  // Create test user in database if doesn't exist
  await getSupabase()
    .from('users')
    .upsert({
      id: userId,
      email,
      created_at: new Date().toISOString()
    });
  
  // Generate JWT token
  const token = jwt.sign(
    {
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    },
    process.env.SUPABASE_JWT_SECRET || 'test-secret'
  );
  
  return token;
}

export async function cleanupTestUser(userId: string): Promise<void> {
  // Delete in correct order to avoid foreign key constraints
  await getSupabase()
    .from('payment_methods')
    .delete()
    .eq('user_id', userId);
    
  await getSupabase()
    .from('user_billing')
    .delete()
    .eq('user_id', userId);
    
  await getSupabase()
    .from('users')
    .delete()
    .eq('id', userId);
}