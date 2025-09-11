/**
 * Shopping cart implementation with some intentional issues for testing agents
 */

// Global variable (issue: global state)
var cartItems = [];

// Function to add item to cart (issue: no input validation)
function addToCart(item) {
  cartItems.push(item);
}

// Calculate cart total (issue: doesn't handle empty cart, potential floating point issues)
function calculateTotal() {
  let total = 0;
  for(var i=0; i<cartItems.length; i++) {
    total += cartItems[i].price;
  }
  return total;
}

// Apply discount (issue: doesn't validate discount percentage)
function applyDiscount(total, discountPercent) {
  return total - (total * (discountPercent / 100));
}

// Process payment (issue: no error handling, unused parameters)
function processPayment(total, paymentMethod, customerInfo) {
  // Simulate payment processing
  console.log(`Processing payment of $${total}`);
  return true; // Always returns success
}

// Clear cart (issue: doesn't return anything to indicate success)
function clearCart() {
  cartItems = [];
}

// Example usage with potential issues
function checkout(discount) {
  const subtotal = calculateTotal();
  
  // Issue: possible division by zero
  const taxRate = 100 / cartItems.length;
  const tax = subtotal * (taxRate / 100);
  
  // Issue: possible NaN if discount is not a number
  const total = applyDiscount(subtotal + tax, discount);
  
  // Issue: doesn't check processPayment result
  processPayment(total);
  
  // Issue: cart cleared before confirmation
  clearCart();
  
  return {
    subtotal: subtotal,
    tax: tax,
    discount: discount,
    total: total
  };
}

// Export functions
module.exports = {
  addToCart,
  calculateTotal,
  applyDiscount,
  processPayment,
  clearCart,
  checkout
};
