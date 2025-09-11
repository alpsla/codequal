function checkTokenExpiry(token) {
  if (!token) {
    console.log('No token provided');
    return;
  }

  try {
    // Decode JWT token
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('Invalid token format');
      return;
    }

    const payload = JSON.parse(atob(parts[1].replace(/_/g, '/').replace(/-/g, '+')));
    
    console.log('\n=== Token Information ===\n');
    
    // Check expiration
    if (payload.exp) {
      const expiryDate = new Date(payload.exp * 1000);
      const now = new Date();
      const hoursUntilExpiry = (expiryDate - now) / (1000 * 60 * 60);
      
      console.log('Token expires at:', expiryDate.toLocaleString());
      console.log('Current time:', now.toLocaleString());
      
      if (hoursUntilExpiry > 0) {
        console.log(`Time until expiry: ${hoursUntilExpiry.toFixed(2)} hours`);
        
        if (hoursUntilExpiry < 1) {
          console.log('\n⚠️  WARNING: Token expires in less than 1 hour!');
        }
      } else {
        console.log('\n❌ Token has EXPIRED!');
      }
    }
    
    // Check issued at
    if (payload.iat) {
      const issuedDate = new Date(payload.iat * 1000);
      const tokenAge = (Date.now() - issuedDate) / (1000 * 60 * 60);
      console.log('\nToken issued at:', issuedDate.toLocaleString());
      console.log(`Token age: ${tokenAge.toFixed(2)} hours`);
    }
    
    // Show token lifetime
    if (payload.exp && payload.iat) {
      const lifetime = (payload.exp - payload.iat) / 3600;
      console.log(`\nToken lifetime: ${lifetime} hours`);
    }
    
    // Other useful info
    console.log('\nOther token info:');
    console.log('User ID:', payload.sub);
    console.log('Email:', payload.email);
    console.log('Role:', payload.role);
    
    // Supabase specific
    if (payload.session_id) {
      console.log('Session ID:', payload.session_id);
    }

  } catch (error) {
    console.error('Error decoding token:', error);
  }
}

// Instructions for browser console
console.log('=== How to check your token expiry ===\n');
console.log('1. Open your browser console on the CodeQual app');
console.log('2. Run this command:\n');
console.log(`checkTokenExpiry(localStorage.getItem('access_token'))`);
console.log('\n3. Or copy this entire script and paste it in the console:\n');
console.log('// Copy everything below this line:');
console.log('(' + checkTokenExpiry.toString() + ')(localStorage.getItem("access_token"));');