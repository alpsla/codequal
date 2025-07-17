const crypto = require('crypto');

// Generate a test API key for slavataichi@gmail.com
function generateApiKey() {
  const prefix = 'ck_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const apiKey = prefix + randomBytes;
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  console.log('API Key Details:');
  console.log('================');
  console.log('Full API Key (save this!):', apiKey);
  console.log('Key Hash (for database):', keyHash);
  console.log('Key Prefix:', prefix);
  
  console.log('\nSQL to insert into database:');
  console.log(`
INSERT INTO api_keys (
  user_id,
  name,
  key_prefix,
  key_hash,
  usage_limit,
  active,
  permissions,
  created_at,
  updated_at
) VALUES (
  '9ea0c2a9-8b33-409a-a45e-fe218d13d65e', -- slavataichi@gmail.com
  'E2E Test Key',
  '${prefix}',
  '${keyHash}',
  1000,
  true,
  '{"endpoints": "*"}',
  NOW(),
  NOW()
);
  `);
}

generateApiKey();