import { createLogger } from '@codequal/core/utils';

// Pricing configuration directly in the file for now
const PricingConfig = {
  TIERS: {
    free: { name: 'Free', basePrice: 0, currency: 'USD', stripePriceId: '' },
    starter: { name: 'Starter', basePrice: 99, currency: 'USD', stripePriceId: '' },
    growth: { name: 'Growth', basePrice: 299, currency: 'USD', stripePriceId: '' },
    scale: { name: 'Scale', basePrice: 990, currency: 'USD', stripePriceId: '' },
    enterprise: { name: 'Enterprise', basePrice: 0, currency: 'USD', stripePriceId: '' }
  },
  PROMO_CODES: {} as Record<string, any>
};

// Stripe type definition (since we don't have the module)
type Stripe = any;

export class StripeIntegration {
  private stripe: Stripe | null = null;
  private logger = createLogger('StripeIntegration');

  constructor() {
    // Will be initialized when Stripe is set up
    if (process.env.STRIPE_SECRET_KEY) {
      // Will initialize Stripe when the library is installed
      // this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      //   apiVersion: '2023-10-16'
      // });
    }
  }

  // Check if Stripe is configured
  isConfigured(): boolean {
    return this.stripe !== null;
  }

  // Placeholder methods that will work when Stripe is connected
  async createCustomer(email: string, metadata?: any): Promise<string> {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured, returning mock customer ID');
      return `mock_customer_${Date.now()}`;
    }

    const customer = await this.stripe.customers.create({
      email,
      metadata: {
        ...metadata,
        created_via: 'api_signup'
      }
    });

    return customer.id;
  }

  async createSubscription(
    customerId: string,
    tierId: string,
    promoCode?: string
  ): Promise<any> {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured, returning mock subscription');
      return {
        id: `mock_sub_${Date.now()}`,
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
    }

    const tier = PricingConfig.TIERS[tierId as keyof typeof PricingConfig.TIERS];
    if (!tier.stripePriceId) {
      throw new Error(`No Stripe price ID for tier: ${tierId}`);
    }

    // Apply promo code if provided
    const params: any = {
      customer: customerId,
      items: [{ price: tier.stripePriceId }],
      metadata: {
        tier_id: tierId
      }
    };

    if (promoCode && PricingConfig.PROMO_CODES[promoCode]) {
      // Would need to create Stripe coupon first
      // params.coupon = stripeCouponId;
    }

    return await this.stripe.subscriptions.create(params);
  }

  async createCheckoutSession(
    tierId: string,
    successUrl: string,
    cancelUrl: string,
    metadata?: any
  ): Promise<string> {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured, returning mock checkout URL');
      return `${successUrl}?mock_session=${Date.now()}`;
    }

    const tier = PricingConfig.TIERS[tierId as keyof typeof PricingConfig.TIERS];
    
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: tier.stripePriceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...metadata,
        tier_id: tierId
      },
      subscription_data: {
        metadata: {
          tier_id: tierId
        }
      },
      // Enable tax collection
      automatic_tax: {
        enabled: true
      },
      tax_id_collection: {
        enabled: true
      }
    });

    return session.url!;
  }

  async handleWebhook(
    rawBody: string,
    signature: string
  ): Promise<{ type: string; data: any }> {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured, ignoring webhook');
      return { type: 'ignored', data: {} };
    }

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      endpointSecret
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        // New subscription created
        return {
          type: 'subscription_created',
          data: event.data.object
        };

      case 'invoice.payment_succeeded':
        // Monthly payment successful
        return {
          type: 'payment_success',
          data: event.data.object
        };

      case 'customer.subscription.updated':
        // Plan changed
        return {
          type: 'subscription_updated',
          data: event.data.object
        };

      case 'customer.subscription.deleted':
        // Subscription cancelled
        return {
          type: 'subscription_cancelled',
          data: event.data.object
        };

      default:
        return {
          type: event.type,
          data: event.data.object
        };
    }
  }

  // Create usage record for metered billing
  async reportUsage(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: number
  ): Promise<void> {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured, skipping usage report');
      return;
    }

    await this.stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        action: 'increment'
      }
    );
  }

  // Helper to sync products and prices
  async syncPricingTiers(): Promise<void> {
    if (!this.stripe) {
      this.logger.error('Cannot sync pricing - Stripe not configured');
      return;
    }

    for (const [tierId, tier] of Object.entries(PricingConfig.TIERS)) {
      if (tier.basePrice === 0 && tierId !== 'free') continue;

      // Create or update product
      const product = await this.stripe.products.create({
        name: `CodeQual ${tier.name}`,
        metadata: {
          tier_id: tierId
        }
      });

      // Create price
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: (tier?.basePrice || 0) * 100, // Convert to cents
        currency: tier.currency.toLowerCase(),
        recurring: {
          interval: 'month'
        },
        metadata: {
          tier_id: tierId
        }
      });

      this.logger.info(`Created Stripe price for tier`, {
        product_id: product.id,
        price_id: price.id
      });

      // Would update the config with Stripe IDs in production
      // tier.stripeProductId = product.id;
      // tier.stripePriceId = price.id;
    }
  }
}