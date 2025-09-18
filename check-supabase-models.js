#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkModels() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔍 Querying Supabase for Java/Large model configurations...\n');

  // First check table structure
  const { data: schema, error: schemaError } = await supabase
    .from('model_configurations')
    .select('*')
    .limit(1);

  if (schema && schema.length > 0) {
    console.log('Table columns:', Object.keys(schema[0]));
  }

  const { data, error } = await supabase
    .from('model_configurations')
    .select('*')
    .or('language.eq.java,role.eq.analyzer')
    .order('last_updated', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No configurations found for Java/Large');

    // Check what we do have
    const { data: allData } = await supabase
      .from('model_configurations')
      .select('language, repository_size, role, primary_model')
      .limit(10);

    console.log('\nSample of existing configurations:');
    console.table(allData);
    return;
  }

  console.log('Found configurations:');
  console.table(data.map(d => ({
    role: d.role,
    primary: d.primary_model,
    fallback: d.fallback_model,
    temp: d.temperature,
    updated: d.last_updated?.substring(0, 10)
  })));
}

checkModels().catch(console.error);