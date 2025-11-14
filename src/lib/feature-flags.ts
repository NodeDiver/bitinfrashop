/**
 * Feature Flags System
 *
 * Centralized feature flag management for controlled rollout of new features.
 * Flags can be controlled via environment variables or database settings.
 */

export type FeatureFlag =
  | 'btcpay_integration'
  | 'nwc_payments'
  | 'provider_webhooks'
  | 'auto_retry_failed_connections'
  | 'email_notifications'
  | 'advanced_analytics'
  | 'provider_marketplace'
  | 'subscription_management';

interface FeatureFlagConfig {
  name: FeatureFlag;
  description: string;
  defaultEnabled: boolean;
  envVar?: string;
}

const FEATURE_FLAGS: FeatureFlagConfig[] = [
  {
    name: 'btcpay_integration',
    description: 'Enable BTCPay Server Greenfield API integration',
    defaultEnabled: true,
    envVar: 'FEATURE_BTCPAY_INTEGRATION'
  },
  {
    name: 'nwc_payments',
    description: 'Enable NWC (Nostr Wallet Connect) payments',
    defaultEnabled: true,
    envVar: 'FEATURE_NWC_PAYMENTS'
  },
  {
    name: 'provider_webhooks',
    description: 'Enable webhook processing from providers',
    defaultEnabled: true,
    envVar: 'FEATURE_PROVIDER_WEBHOOKS'
  },
  {
    name: 'auto_retry_failed_connections',
    description: 'Automatically retry failed connection setups',
    defaultEnabled: true,
    envVar: 'FEATURE_AUTO_RETRY'
  },
  {
    name: 'email_notifications',
    description: 'Send email notifications to users',
    defaultEnabled: false,
    envVar: 'FEATURE_EMAIL_NOTIFICATIONS'
  },
  {
    name: 'advanced_analytics',
    description: 'Enable advanced analytics dashboards',
    defaultEnabled: false,
    envVar: 'FEATURE_ADVANCED_ANALYTICS'
  },
  {
    name: 'provider_marketplace',
    description: 'Enable public provider marketplace',
    defaultEnabled: true,
    envVar: 'FEATURE_PROVIDER_MARKETPLACE'
  },
  {
    name: 'subscription_management',
    description: 'Enable subscription pause/cancel features',
    defaultEnabled: true,
    envVar: 'FEATURE_SUBSCRIPTION_MANAGEMENT'
  }
];

class FeatureFlagService {
  private flagCache: Map<FeatureFlag, boolean> = new Map();

  /**
   * Check if a feature is enabled
   */
  isEnabled(flag: FeatureFlag): boolean {
    // Check cache first
    if (this.flagCache.has(flag)) {
      return this.flagCache.get(flag)!;
    }

    // Find flag configuration
    const config = FEATURE_FLAGS.find(f => f.name === flag);
    if (!config) {
      console.warn(`Unknown feature flag: ${flag}`);
      return false;
    }

    // Check environment variable if defined
    let enabled = config.defaultEnabled;
    if (config.envVar && process.env[config.envVar] !== undefined) {
      enabled = process.env[config.envVar] === 'true';
    }

    // Cache result
    this.flagCache.set(flag, enabled);
    return enabled;
  }

  /**
   * Check if a feature is disabled
   */
  isDisabled(flag: FeatureFlag): boolean {
    return !this.isEnabled(flag);
  }

  /**
   * Get all feature flags with their status
   */
  getAllFlags(): Array<{ name: FeatureFlag; description: string; enabled: boolean }> {
    return FEATURE_FLAGS.map(config => ({
      name: config.name,
      description: config.description,
      enabled: this.isEnabled(config.name)
    }));
  }

  /**
   * Clear cache (useful for testing or runtime updates)
   */
  clearCache(): void {
    this.flagCache.clear();
  }

  /**
   * Override a flag (useful for testing)
   */
  override(flag: FeatureFlag, enabled: boolean): void {
    this.flagCache.set(flag, enabled);
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlagService();

// Export class for testing
export { FeatureFlagService };
