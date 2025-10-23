import { ModelResearcherService } from './src/two-branch/research-services/model-researcher-service';

async function test() {
  const researcher = new ModelResearcherService();
  console.log('\n=== Security Model Selection Test ===');
  console.log('Weights: quality=0.35, speed=0.30, cost=0.35, freshness=0.00\n');
  
  try {
    const result = await researcher.researchModelsForRole('security', 'java', 'medium');
    console.log('\n📊 Top 5 Models:\n');
    result.recommendations.slice(0, 5).forEach((m: any, i: number) => {
      console.log(`${i + 1}. ${m.modelId} (Score: ${m.totalScore.toFixed(3)})`);
      console.log(`   Q:${m.qualityScore.toFixed(2)} S:${m.speedScore.toFixed(2)} C:${m.costScore.toFixed(2)}`);
      console.log(`   Price: $${m.pricing.prompt}/$${m.pricing.completion} per 1M tokens\n`);
    });
    console.log(`✅ Selected: ${result.selectedModel.modelId}\n`);
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}
test();
