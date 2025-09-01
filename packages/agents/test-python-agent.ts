import { PythonSecurityAgent } from './src/two-branch/agents/PythonSecurityAgent';

async function test() {
  const agent = new PythonSecurityAgent();
  const result = await agent.analyze({
    files: [{path: 'test.py', content: 'print(1)', branch: 'main'}],
    headBranch: 'main'
  });
  console.log('Issues found:', result.issues.length);
  console.log('Tools used:', result.toolsUsed);
  console.log('Issues:', result.issues);
}

test().catch(console.error);