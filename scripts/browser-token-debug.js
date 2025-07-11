// Copy and paste this entire script into your browser console

(function debugTokens() {
  console.log('\n=== 🔍 Token Debug Information ===\n');
  
  const accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  
  console.log('📦 Stored Tokens:');
  console.log('- Access Token:', accessToken ? '✅ Present' : '❌ Missing');
  console.log('- Refresh Token:', refreshToken ? '✅ Present' : '❌ Missing');
  
  if (!accessToken) {
    console.log('\n⚠️  No access token found. You need to log in.');
    return;
  }
  
  // Decode and check access token
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      console.log('\n❌ Invalid token format');
      return;
    }
    
    const payload = JSON.parse(atob(parts[1].replace(/_/g, '/').replace(/-/g, '+')));
    
    console.log('\n🎫 Access Token Details:');
    console.log('- User ID:', payload.sub);
    console.log('- Email:', payload.email);
    console.log('- Role:', payload.role);
    
    if (payload.exp) {
      const expiryDate = new Date(payload.exp * 1000);
      const now = new Date();
      const timeLeft = expiryDate - now;
      const minutesLeft = Math.floor(timeLeft / 1000 / 60);
      
      console.log('\n⏰ Token Expiration:');
      console.log('- Expires at:', expiryDate.toLocaleString());
      console.log('- Current time:', now.toLocaleString());
      
      if (minutesLeft > 0) {
        console.log('- Status: ✅ Valid for', minutesLeft, 'more minutes');
        
        if (minutesLeft < 60) {
          console.log('- Warning: Token expires in less than 1 hour!');
        }
      } else {
        console.log('- Status: ❌ EXPIRED');
      }
    }
    
    if (payload.iat) {
      const issuedDate = new Date(payload.iat * 1000);
      const ageHours = (Date.now() - issuedDate) / (1000 * 60 * 60);
      console.log('\n📅 Token Age:');
      console.log('- Issued at:', issuedDate.toLocaleString());
      console.log('- Age:', ageHours.toFixed(1), 'hours');
    }
    
  } catch (error) {
    console.error('\n❌ Error decoding token:', error);
  }
  
  console.log('\n💡 Tips:');
  console.log('- If tokens are missing, log out and log back in');
  console.log('- The app should automatically refresh tokens before they expire');
  console.log('- Check the console for [Token Refresh] messages');
  console.log('- Refresh tokens typically last 30+ days');
  
  console.log('\n🔧 Manual Actions:');
  console.log('To manually trigger a token check, run:');
  console.log("localStorage.setItem('manual_token_check', Date.now()); location.reload();");
})();