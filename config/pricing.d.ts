export interface PricingTier {
    id: string;
    name: string;
    basePrice: number;
    currency: 'USD' | 'EUR' | 'GBP';
    apiCallsPerMonth: number;
    apiKeysAllowed: number;
    rateLimit: {
        perMinute: number;
        perHour: number;
    };
    features: string[];
    stripePriceId?: string;
    stripeProductId?: string;
}
export interface PricingModifier {
    type: 'percentage' | 'fixed';
    value: number;
    reason: string;
    validUntil?: Date;
}
export declare class PricingConfig {
    static readonly TIERS: Record<string, PricingTier>;
    static readonly PROMO_CODES: Record<string, PricingModifier>;
    static readonly AB_TEST_VARIANTS: {
        control: {
            starter: number;
            growth: number;
            scale: number;
        };
        variant_a: {
            starter: number;
            growth: number;
            scale: number;
        };
        variant_b: {
            starter: number;
            growth: number;
            scale: number;
        };
    };
    static calculatePrice(tierId: string, modifiers?: PricingModifier[], variant?: string): number;
    static recommendTier(monthlyApiCalls: number): string;
    static calculateOverageCharge(tierId: string, actualUsage: number): number;
}
