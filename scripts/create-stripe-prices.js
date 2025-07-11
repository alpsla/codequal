const Stripe = require('stripe');

// Use your test secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51RiLenH9VfPdHERjw6vRQ9IqaG4g2opDmmGBLHYpmGNKGxoYGo7jnWJS7QlMya6OVh8MLNWe5lhTSC7OhnIYSl3G00tf2ryUnu');

async function createPrices() {
  try {
    console.log('Creating Stripe products and prices...\n');

    // Create products first
    const apiProduct = await stripe.products.create({
      name: 'CodeQual API Access',
      description: 'API-only access for developers'
    });
    console.log('✅ Created API product:', apiProduct.id);

    const individualProduct = await stripe.products.create({
      name: 'CodeQual Individual',
      description: 'Full access for individual developers'
    });
    console.log('✅ Created Individual product:', individualProduct.id);

    const teamProduct = await stripe.products.create({
      name: 'CodeQual Team',
      description: 'Team plan with collaboration features'
    });
    console.log('✅ Created Team product:', teamProduct.id);

    // Create prices
    const apiPrice = await stripe.prices.create({
      product: apiProduct.id,
      unit_amount: 999, // $9.99
      currency: 'usd',
      recurring: {
        interval: 'month'
      }
    });
    console.log('✅ Created API price:', apiPrice.id);

    const individualPrice = await stripe.prices.create({
      product: individualProduct.id,
      unit_amount: 2900, // $29.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      }
    });
    console.log('✅ Created Individual price:', individualPrice.id);

    const teamPrice = await stripe.prices.create({
      product: teamProduct.id,
      unit_amount: 9900, // $99.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      }
    });
    console.log('✅ Created Team price:', teamPrice.id);

    console.log('\n🎉 All products and prices created successfully!\n');
    console.log('Add these to your .env file:');
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_API=${apiPrice.id}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL=${individualPrice.id}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_TEAM=${teamPrice.id}`);

  } catch (error) {
    console.error('Error creating prices:', error.message);
  }
}

createPrices();