const SUPABASE_URL = 'https://ftjhmbbcuqjqmmbaymqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0amhtYmJjdXFqcW1tYmF5bXFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODg1OTczNCwiZXhwIjoyMDU0NDM1NzM0fQ.ldT_p0Xn64S3OM5AR27-Iht27nUkbR9kGDyaJftPt-s';

async function checkModelSelections() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/model_selection_history?order=created_at.desc&limit=15`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('Failed to fetch:', response.status, response.statusText);
      const text = await response.text();
      console.log('Response:', text);
      return;
    }
    
    const data = await response.json();
    console.log('Recent Model Selections from Supabase:');
    console.log('=====================================\n');
    
    if (data && data.length > 0) {
      // Group by model
      const modelCounts = {};
      data.forEach(selection => {
        const model = selection.selected_model || 'Unknown';
        modelCounts[model] = (modelCounts[model] || 0) + 1;
      });
      
      console.log('Model Usage Summary:');
      Object.entries(modelCounts).forEach(([model, count]) => {
        console.log(`  ${model}: ${count} times`);
      });
      console.log('\nDetailed History:');
      console.log('-----------------');
      
      data.slice(0, 10).forEach((selection, idx) => {
        console.log(`\n${idx + 1}. ${selection.created_at || 'Unknown date'}`);
        console.log(`   Role: ${selection.role || 'Unknown'}`);
        console.log(`   Selected Model: ${selection.selected_model || 'Unknown'}`);
        console.log(`   Provider: ${selection.provider || 'Unknown'}`);
        if (selection.context) {
          console.log(`   Language: ${selection.context.language || 'Unknown'}`);
          console.log(`   Size: ${selection.context.size || 'Unknown'}`);
        }
        if (selection.selection_metadata) {
          console.log(`   Score: ${selection.selection_metadata.score || 'N/A'}`);
        }
      });
    } else {
      console.log('No recent model selections found in database');
    }
  } catch (error) {
    console.error('Error fetching model selections:', error.message);
  }
}

checkModelSelections();