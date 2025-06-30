"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingConfig = void 0;
class PricingConfig {
    // Calculate final price with modifiers
    static calculatePrice(tierId, modifiers = [], variant = 'control') {
        const tier = this.TIERS[tierId];
        if (!tier)
            throw new Error(`Unknown tier: ${tierId}`);
        // Start with base price or A/B test price
        let price = tier.basePrice;
        if (variant !== 'control' && this.AB_TEST_VARIANTS[variant]) {
            price = this.AB_TEST_VARIANTS[variant][tierId] || price;
        }
        // Apply modifiers
        for (const modifier of modifiers) {
            if (modifier.validUntil && new Date() > modifier.validUntil) {
                continue; // Skip expired modifiers
            }
            if (modifier.type === 'percentage') {
                price = price * (1 - modifier.value / 100);
            }
            else {
                price = Math.max(0, price - modifier.value);
            }
        }
        return Math.round(price * 100) / 100; // Round to cents
    }
    // Get tier by usage
    static recommendTier(monthlyApiCalls) {
        if (monthlyApiCalls <= 100)
            return 'free';
        if (monthlyApiCalls <= 1000)
            return 'starter';
        if (monthlyApiCalls <= 5000)
            return 'growth';
        if (monthlyApiCalls <= 20000)
            return 'scale';
        return 'enterprise';
    }
    // Usage-based pricing for overages
    static calculateOverageCharge(tierId, actualUsage) {
        const tier = this.TIERS[tierId];
        if (!tier || tier.apiCallsPerMonth === -1)
            return 0;
        const overage = Math.max(0, actualUsage - tier.apiCallsPerMonth);
        if (overage === 0)
            return 0;
        // Overage rates per 1000 calls
        const overageRates = {
            free: 0, // No overages on free tier
            starter: 20, // $0.02 per call
            growth: 15, // $0.015 per call
            scale: 10, // $0.01 per call
            enterprise: 0 // Custom pricing
        };
        const rate = overageRates[tierId] || 0;
        return (overage / 1000) * rate;
    }
}
exports.PricingConfig = PricingConfig;
// Base pricing tiers
PricingConfig.TIERS = {
    free: {
        id: 'free',
        name: 'Free',
        basePrice: 0,
        currency: 'USD',
        apiCallsPerMonth: 100,
        apiKeysAllowed: 1,
        rateLimit: {
            perMinute: 10,
            perHour: 100
        },
        features: [
            'Basic PR analysis',
            'Community support',
            'Public repos only'
        ]
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        basePrice: 99,
        currency: 'USD',
        apiCallsPerMonth: 1000,
        apiKeysAllowed: 3,
        rateLimit: {
            perMinute: 60,
            perHour: 1000
        },
        features: [
            'Full PR analysis',
            'Email support',
            'Private repos',
            'Basic reporting'
        ]
    },
    growth: {
        id: 'growth',
        name: 'Growth',
        basePrice: 299,
        currency: 'USD',
        apiCallsPerMonth: 5000,
        apiKeysAllowed: 10,
        rateLimit: {
            perMinute: 120,
            perHour: 5000
        },
        features: [
            'Everything in Starter',
            'Priority support',
            'Advanced analytics',
            'Team collaboration',
            'Custom integrations'
        ]
    },
    scale: {
        id: 'scale',
        name: 'Scale',
        basePrice: 990,
        currency: 'USD',
        apiCallsPerMonth: 20000,
        apiKeysAllowed: 50,
        rateLimit: {
            perMinute: 300,
            perHour: 20000
        },
        features: [
            'Everything in Growth',
            'Dedicated support',
            'SLA guarantee',
            'Custom models',
            'White-label options'
        ]
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        basePrice: 0, // Custom pricing
        currency: 'USD',
        apiCallsPerMonth: -1, // Unlimited
        apiKeysAllowed: -1, // Unlimited
        rateLimit: {
            perMinute: 1000,
            perHour: 100000
        },
        features: [
            'Everything in Scale',
            'Custom deployment',
            'On-premise option',
            'Custom training',
            'Dedicated account manager'
        ]
    }
};
// Promotional codes
PricingConfig.PROMO_CODES = {
    'BETA50': {
        type: 'percentage',
        value: 50,
        reason: 'Beta user discount',
        validUntil: new Date('2025-03-31')
    },
    'LAUNCH30': {
        type: 'percentage',
        value: 30,
        reason: 'Launch promotion',
        validUntil: new Date('2025-02-28')
    },
    'FRIEND20': {
        type: 'percentage',
        value: 20,
        reason: 'Referral discount',
        // No expiration
    }
};
// A/B test pricing variants
PricingConfig.AB_TEST_VARIANTS = {
    control: {
        starter: 99,
        growth: 299,
        scale: 990
    },
    variant_a: {
        starter: 79,
        growth: 249,
        scale: 890
    },
    variant_b: {
        starter: 119,
        growth: 349,
        scale: 1190
    }
};
