// Run this in browser console to see the actual error

(async function() {
  const token = localStorage.getItem('access_token');
  
  // Test GET /api/keys
  console.log('\n=== Testing GET /api/keys ===');
  const getResp = await fetch('http://localhost:3001/api/keys', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const getData = await getResp.json();
  console.log('GET Response:', getResp.status, getData);
  
  // Test POST /api/keys
  console.log('\n=== Testing POST /api/keys ===');
  const postResp = await fetch('http://localhost:3001/api/keys', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'Test Key' })
  });
  const postData = await postResp.json();
  console.log('POST Response:', postResp.status, postData);
})();