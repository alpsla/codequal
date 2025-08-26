import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';

async function testRealDeepWiki() {
  console.log('🔍 Testing REAL DeepWiki integration...\n');

  const api = new DirectDeepWikiApiWithLocation();

  // Test with a real repo (small one for speed)
  const result = await api.analyzeRepository('https://github.com/sindresorhus/ky', {
    branch: 'main'
  });

  console.log('✅ Analysis complete');
  console.log(`📊 Issues found: ${result.issues?.length || 0}`);

  if (result.issues && result.issues.length > 0) {
    console.log('\n🔍 First 3 issues:');
    result.issues.slice(0, 3).forEach((issue, i) => {
      console.log(`\n${i + 1}. ${issue.title || issue.message}`);
      console.log(`   Type: ${issue.type || 'unknown'}`);
      console.log(`   Severity: ${issue.severity || 'unknown'}`);
      console.log(`   Location: ${issue.location?.file || issue.file || 'UNKNOWN'}`);
      console.log(`   Line: ${issue.location?.line || issue.line || 'UNKNOWN'}`);
      console.log(`   Has code snippet: ${!!issue.codeSnippet}`);
      
      // Check if location is properly extracted
      if (issue.location?.file === 'unknown' || issue.file === 'unknown') {
        console.log('   ❌ ERROR: Location is unknown - location finding is broken!');
      } else if (issue.location?.file || issue.file) {
        console.log('   ✅ Location found successfully!');
      }
    });

    // Summary
    const unknownLocations = result.issues.filter(i => 
      (i.location?.file === 'unknown' || i.file === 'unknown') || 
      (!i.location?.file && !i.file)
    ).length;
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total issues: ${result.issues.length}`);
    console.log(`   Issues with location: ${result.issues.length - unknownLocations}`);
    console.log(`   Issues without location: ${unknownLocations}`);
    
    if (unknownLocations > result.issues.length * 0.5) {
      console.log('\n⚠️  WARNING: More than 50% of issues have unknown location!');
      console.log('   Location extraction may be broken.');
    } else if (unknownLocations === 0) {
      console.log('\n✅ SUCCESS: All issues have locations!');
    }
  } else {
    console.log('\n⚠️  No issues found - this might indicate a problem');
  }
}

testRealDeepWiki().catch(console.error);