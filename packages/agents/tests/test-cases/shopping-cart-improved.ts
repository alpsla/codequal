/**
 * Improved shopping cart implementation in TypeScript
 */

// Define cart item interface
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Shopping cart class - replaces global variable
class ShoppingCart {
  private items: CartItem[] = [];
  
  // Add item to cart with validation
  addItem(item: CartItem): void {
    // Validate input
    if (!item.id || !item.name || item.price <= 0 || item.quantity <= 0) {
      throw new Error('Invalid item data');
    }
    
    // Check if item already exists in cart
    const existingItem = this.items.find(i => i.id === item.id);
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      this.items.push({...item}); // Add a copy of the item
    }
  }
  
  // Calculate cart total
  calculateTotal(): number {
    if (this.items.length === 0) {
      return 0; // Handle empty cart
    }
    
    return this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }
  
  // Apply discount with validation
  applyDiscount(total: number, discountPercent: number): number {
    // Validate discount
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      throw new Error('Invalid discount percentage');
    }
    
    return total - (total * (discountPercent / 100));
  }
  
  // Calculate tax
  calculateTax(subtotal: number, taxRate: number): number {
    // Validate tax rate
    if (isNaN(taxRate) || taxRate < 0) {
      throw new Error('Invalid tax rate');
    }
    
    return subtotal * (taxRate / 100);
  }
  
  // Process payment with error handling
  async processPayment(total: number, paymentMethod: string, customerInfo: any): Promise<boolean> {
    try {
      // Simulate payment processing
      console.log(`Processing ${paymentMethod} payment of $${total.toFixed(2)}`);
      
      // In a real implementation, this would call a payment API
      // For now, just simulate a successful payment
      return true;
    } catch (error) {
      console.error('Payment processing failed:', error);
      return false;
    }
  }
  
  // Clear cart and return success
  clearCart(): boolean {
    this.items = [];
    return true;
  }
  
  // Get cart items
  getItems(): CartItem[] {
    return [...this.items]; // Return a copy to prevent external modification
  }
  
  // Checkout process
  async checkout(discountPercent: number = 0, taxRate: number = 8.25): Promise<any> {
    // Validate cart
    if (this.items.length === 0) {
      throw new Error('Cannot checkout with empty cart');
    }
    
    const subtotal = this.calculateTotal();
    const tax = this.calculateTax(subtotal, taxRate);
    const total = this.applyDiscount(subtotal + tax, discountPercent);
    
    // Process payment
    const paymentResult = await this.processPayment(total, 'credit_card', {});
    
    // Only clear cart if payment was successful
    if (paymentResult) {
      this.clearCart();
      
      return {
        success: true,
        subtotal,
        tax,
        discount: discountPercent,
        total,
        items: this.getItems()
      };
    } else {
      return {
        success: false,
        message: 'Payment processing failed'
      };
    }
  }
}

export default ShoppingCart;
