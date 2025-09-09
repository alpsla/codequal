#!/usr/bin/env node

const { exec: execCallback } = require('child_process');
const { promisify } = require('util');
const exec = promisify(execCallback);

async function analyzeRegistry() {
  console.log('🔍 Registry Space Analysis');
  console.log('=' .repeat(60));
  
  // Current visible images (from your screenshot)
  const visibleImages = [
    { tag: 'lang-python-v3', size: 100.45, unit: 'MB' },
    { tag: 'lang-javascript-v3', size: 83, unit: 'MB' },
    { tag: 'lang-java-v3', size: 488.67, unit: 'MB' },
    { tag: 'lang-php-v3', size: 210.26, unit: 'MB' },
    { tag: 'lang-perl-v3', size: 198, unit: 'MB' },
    { tag: 'lang-cpp-v3', size: 317.64, unit: 'MB' },
    { tag: 'lang-go-v3', size: 127.94, unit: 'MB' },
    { tag: 'lang-ruby-v3', size: 203.57, unit: 'MB' },
    { tag: 'lang-csharp-v3', size: 366.02, unit: 'MB' }
  ];
  
  // Calculate total visible size
  const totalVisible = visibleImages.reduce((sum, img) => sum + img.size, 0);
  console.log(`\n📦 Visible Images (9 containers):`);
  visibleImages.forEach(img => {
    console.log(`   ${img.tag.padEnd(20)} ${img.size.toFixed(2).padStart(8)} ${img.unit}`);
  });
  console.log(`   ${'Total:'.padEnd(20)} ${totalVisible.toFixed(2).padStart(8)} MB (~${(totalVisible/1024).toFixed(2)} GB)`);
  
  console.log(`\n📊 Registry Usage:`);
  console.log(`   Reported: 5.32 GB (106% of 5 GB limit)`);
  console.log(`   Visible:  ${(totalVisible/1024).toFixed(2)} GB`);
  console.log(`   Hidden:   ${(5.32 - totalVisible/1024).toFixed(2)} GB`);
  
  console.log(`\n🔎 What's likely taking the extra ~3.2 GB:`);
  console.log(`\n1. OLD LAYERS from previous pushes:`);
  console.log(`   - Each push creates new layers`);
  console.log(`   - Old layers remain until garbage collection`);
  console.log(`   - We've pushed v1, v2, v3 versions = 3x layers`);
  
  console.log(`\n2. SHARED BASE LAYERS counted multiple times:`);
  console.log(`   - Ubuntu base images`);
  console.log(`   - Development tools layers`);
  console.log(`   - Each language shares some layers but registry counts all`);
  
  console.log(`\n3. FAILED BUILD ARTIFACTS:`);
  
  // Check for failed builds
  try {
    const { stdout } = await exec('kubectl get pods -n codequal-dev | grep -E "Error|Failed" | grep -E "build|kaniko" | wc -l');
    const failedCount = parseInt(stdout.trim());
    console.log(`   - Found ${failedCount} failed build pods`);
    console.log(`   - Each failed build may leave partial layers`);
  } catch (e) {
    console.log(`   - Could not check failed builds`);
  }
  
  console.log(`\n4. CACHE LAYERS:`);
  console.log(`   - Kaniko uses cache layers for faster builds`);
  console.log(`   - analyzer/cache repository (if exists)`);
  
  console.log(`\n💡 SOLUTIONS:`);
  console.log(`\n1. Run Garbage Collection (most effective):`);
  console.log(`   - Go to DigitalOcean Console`);
  console.log(`   - Registry → Settings → Garbage Collection`);
  console.log(`   - Check "Delete untagged manifests"`);
  console.log(`   - Start Garbage Collection`);
  console.log(`   - This removes ALL unreferenced layers`);
  
  console.log(`\n2. Check for duplicate tags:`);
  try {
    const { stdout } = await exec('doctl registry repository list-tags codequal analyzer 2>/dev/null | wc -l');
    console.log(`   - Current tags in registry: ${stdout.trim()}`);
  } catch (e) {
    console.log(`   - Could not count tags`);
  }
  
  console.log(`\n3. Nuclear option - Export and recreate:`);
  console.log(`   - Pull all 9 images locally`);
  console.log(`   - Delete registry contents`);
  console.log(`   - Push fresh images only`);
  
  console.log(`\n📈 Expected size after cleanup:`);
  console.log(`   - Just the 9 containers: ~2.1 GB`);
  console.log(`   - With Rust added: ~3.2 GB`);
  console.log(`   - Well under 5 GB limit!`);
}

analyzeRegistry().catch(console.error);