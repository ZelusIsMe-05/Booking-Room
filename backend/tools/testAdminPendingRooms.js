const http = require('http');

// Test 1: No auth token → 401
console.log('\n=== Test 1: No auth token (expect 401) ===');
const req1 = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/rooms/pending',
  method: 'GET',
  headers: { Accept: 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', data);
  });
});
req1.on('error', (err) => console.error('ERROR:', err));
req1.end();

// Test 2: Login as admin first
console.log('\n=== Test 2: Login as admin ===');
const loginBody = JSON.stringify({
  identifier: 'admin',
  password: 'Password@123'
});

const req2 = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginBody),
    'Accept': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('LOGIN STATUS:', res.statusCode);
    console.log('LOGIN RESPONSE:', data);
    
    try {
      const parsed = JSON.parse(data);
      console.log('SUCCESS:', parsed.success);
      
      if (parsed.data && parsed.data.accessToken) {
        const token = parsed.data.accessToken;
        console.log('TOKEN:', token.substring(0, 50) + '...');
        
        // Test 3: Call pending rooms with admin token
        setTimeout(() => {
          console.log('\n=== Test 3: Get pending rooms with admin token ===');
          const req3 = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/admin/rooms/pending?page=1&limit=20',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              console.log('STATUS:', res.statusCode);
              try {
                const result = JSON.parse(data);
                console.log('RESPONSE:', JSON.stringify(result, null, 2));
              } catch (e) {
                console.log('RESPONSE:', data);
              }
            });
          });
          req3.on('error', (err) => console.error('ERROR:', err));
          req3.end();
        }, 500);
      } else {
        console.log('No token in response');
      }
    } catch (e) {
      console.log('Failed to parse:', data);
    }
  });
});
req2.on('error', (err) => console.error('LOGIN ERROR:', err));
req2.write(loginBody);
req2.end();
