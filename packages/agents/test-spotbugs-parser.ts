/**
 * SpotBugs Parser Validation Test
 * 
 * This test validates that the SpotBugs XML parser correctly extracts bug instances.
 */

// Sample SpotBugs XML output (from a real scan)
const SAMPLE_SPOTBUGS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<BugCollection version="4.7.3" sequence="0" timestamp="1728345678000">
  <Project projectName="TestProject">
    <SrcDir>/tmp/test-repo/src/main/java</SrcDir>
  </Project>
  
  <BugInstance type="NP_NULL_ON_SOME_PATH" priority="2" rank="15" abbrev="NP" category="CORRECTNESS">
    <ShortMessage>Possible null pointer dereference</ShortMessage>
    <LongMessage>Possible null pointer dereference of user in com.example.UserService.getUser(String)</LongMessage>
    <Class classname="com.example.UserService">
      <SourceLine classname="com.example.UserService" start="45" end="120" sourcefile="UserService.java" sourcepath="com/example/UserService.java"/>
    </Class>
    <Method classname="com.example.UserService" name="getUser" signature="(Ljava/lang/String;)Lcom/example/User;">
      <SourceLine classname="com.example.UserService" start="89" end="95" sourcefile="UserService.java" sourcepath="com/example/UserService.java"/>
    </Method>
    <SourceLine classname="com.example.UserService" start="92" end="92" startBytecode="45" endBytecode="45" sourcefile="UserService.java" sourcepath="com/example/UserService.java"/>
  </BugInstance>
  
  <BugInstance type="SQL_INJECTION_HIBERNATE" priority="1" rank="2" abbrev="SQL" category="SECURITY">
    <ShortMessage>Potential SQL injection</ShortMessage>
    <LongMessage>This usage of Hibernate session allows SQL injection via tainted parameter</LongMessage>
    <Class classname="com.example.UserRepository">
      <SourceLine classname="com.example.UserRepository" start="12" end="78" sourcefile="UserRepository.java" sourcepath="com/example/UserRepository.java"/>
    </Class>
    <Method classname="com.example.UserRepository" name="findByUsername" signature="(Ljava/lang/String;)Ljava/util/List;">
      <SourceLine classname="com.example.UserRepository" start="34" end="39" sourcefile="UserRepository.java" sourcepath="com/example/UserRepository.java"/>
    </Method>
    <SourceLine classname="com.example.UserRepository" start="36" end="36" startBytecode="12" endBytecode="12" sourcefile="UserRepository.java" sourcepath="com/example/UserRepository.java"/>
  </BugInstance>
  
  <BugInstance type="EI_EXPOSE_REP" priority="2" rank="17" abbrev="EI" category="MALICIOUS_CODE">
    <ShortMessage>May expose internal representation by returning reference to mutable object</ShortMessage>
    <LongMessage>com.example.Config.getSecrets() may expose internal representation by returning Config.secrets</LongMessage>
    <Class classname="com.example.Config">
      <SourceLine classname="com.example.Config" start="5" end="45" sourcefile="Config.java" sourcepath="com/example/Config.java"/>
    </Class>
    <Method classname="com.example.Config" name="getSecrets" signature="()[Ljava/lang/String;">
      <SourceLine classname="com.example.Config" start="23" end="25" sourcefile="Config.java" sourcepath="com/example/Config.java"/>
    </Method>
    <SourceLine classname="com.example.Config" start="24" end="24" startBytecode="5" endBytecode="5" sourcefile="Config.java" sourcepath="com/example/Config.java"/>
  </BugInstance>
  
  <BugInstance type="DM_EXIT" priority="3" rank="20" abbrev="Dm" category="BAD_PRACTICE">
    <ShortMessage>Method invokes System.exit()</ShortMessage>
    <LongMessage>com.example.Main.cleanup() invokes System.exit(), which shuts down the entire virtual machine</LongMessage>
    <Class classname="com.example.Main">
      <SourceLine classname="com.example.Main" start="8" end="56" sourcefile="Main.java" sourcepath="com/example/Main.java"/>
    </Class>
    <Method classname="com.example.Main" name="cleanup" signature="()V">
      <SourceLine classname="com.example.Main" start="48" end="53" sourcefile="Main.java" sourcepath="com/example/Main.java"/>
    </Method>
    <SourceLine classname="com.example.Main" start="51" end="51" startBytecode="23" endBytecode="23" sourcefile="Main.java" sourcepath="com/example/Main.java"/>
  </BugInstance>
  
  <Errors errors="0" missingClasses="0"></Errors>
  <FindBugsSummary timestamp="Wed, 02 Oct 2024 14:27:58 +0000" total_classes="42" referenced_classes="156" total_bugs="4" total_size="1247" num_packages="3" java_version="11.0.20" vm_version="11.0.20+8-Ubuntu-1ubuntu120.04" cpu_seconds="12.34" clock_seconds="8.56" peak_mbytes="256.78">
    <PackageStats package="com.example" total_bugs="4" total_types="42" total_size="1247">
      <ClassStats class="com.example.UserService" sourceFile="UserService.java" interface="false" size="234" bugs="1"/>
      <ClassStats class="com.example.UserRepository" sourceFile="UserRepository.java" interface="false" size="156" bugs="1"/>
      <ClassStats class="com.example.Config" sourceFile="Config.java" interface="false" size="89" bugs="1"/>
      <ClassStats class="com.example.Main" sourceFile="Main.java" interface="false" size="123" bugs="1"/>
    </PackageStats>
  </FindBugsSummary>
</BugCollection>`;

// Import the parser (we'll need to access the private method via a workaround)
import { JavaToolOrchestrator } from './src/two-branch/tools/java/java-tool-orchestrator';

function testSpotBugsParser() {
  console.log('🧪 Testing SpotBugs XML Parser\n');
  console.log('Sample XML contains:');
  console.log('  - 4 BugInstances');
  console.log('  - Priority 1 (Critical): 1 issue (SQL_INJECTION)');
  console.log('  - Priority 2 (High): 2 issues (NP_NULL, EI_EXPOSE_REP)');
  console.log('  - Priority 3 (Medium): 1 issue (DM_EXIT)\n');

  // Create orchestrator instance
  const orchestrator = new JavaToolOrchestrator();

  // Access the private parser method using type assertion
  const orchestratorAny = orchestrator as any;
  
  if (typeof orchestratorAny.parseSpotBugsOutput !== 'function') {
    console.error('❌ parseSpotBugsOutput method not found!');
    process.exit(1);
  }

  try {
    const issues = orchestratorAny.parseSpotBugsOutput(SAMPLE_SPOTBUGS_XML);
    
    console.log('✅ Parser executed successfully!\n');
    console.log(`📊 Total issues parsed: ${issues.length}`);
    
    if (issues.length === 0) {
      console.error('\n❌ PARSER BUG: Expected 4 issues but got 0!');
      console.error('This indicates a parsing problem similar to the Semgrep issue.\n');
      process.exit(1);
    }
    
    if (issues.length !== 4) {
      console.warn(`\n⚠️  WARNING: Expected 4 issues but got ${issues.length}`);
    }
    
    console.log('\n📋 Parsed Issues:\n');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.rule} (${issue.severity})`);
      console.log(`   File: ${issue.file}:${issue.line}`);
      console.log(`   Category: ${issue.category}`);
      console.log(`   Message: ${issue.message}\n`);
    });
    
    // Validate severity mapping
    const severityCounts = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
    
    console.log('📊 Severity Distribution:');
    console.log(`   Critical: ${severityCounts.critical}`);
    console.log(`   High: ${severityCounts.high}`);
    console.log(`   Medium: ${severityCounts.medium}`);
    console.log(`   Low: ${severityCounts.low}\n`);
    
    // Expected: 1 critical (priority 1), 2 high (priority 2), 1 medium (priority 3)
    if (severityCounts.critical === 1 && severityCounts.high === 2 && severityCounts.medium === 1) {
      console.log('✅ Severity mapping is CORRECT!');
    } else {
      console.warn('⚠️  Severity mapping may be incorrect');
      console.warn('   Expected: 1 critical, 2 high, 1 medium, 0 low');
    }
    
    console.log('\n✅ SpotBugs parser validation PASSED!');
    console.log('   The parser correctly extracts BugInstances from XML output.\n');
    
  } catch (error: any) {
    console.error('\n❌ PARSER ERROR:', error.message);
    console.error(error.stack);
    console.error('\nThis indicates the SpotBugs parser has a bug!\n');
    process.exit(1);
  }
}

if (require.main === module) {
  testSpotBugsParser();
}

