import { logger } from './logger';
import { BTCPayClient, BTCPayUser, BTCPayStore } from './btcpay-client';

/**
 * BTCPay Dry Run Client
 *
 * Wraps BTCPayClient to provide dry-run mode for testing without making actual API calls.
 * Controlled by BTCPAY_DRY_RUN environment variable.
 */

export class BTCPayDryRunClient extends BTCPayClient {
  private dryRunMode: boolean;

  constructor(hostUrl: string, apiKey: string, dryRun?: boolean) {
    super(hostUrl, apiKey);
    this.dryRunMode = dryRun ?? (process.env.BTCPAY_DRY_RUN === 'true');
  }

  /**
   * Override createUser to support dry-run
   */
  async createUser(email: string, password: string): Promise<BTCPayUser> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would create BTCPay user:', { email });
      return this.mockUser(email);
    }
    return super.createUser(email, password);
  }

  /**
   * Override getUser to support dry-run
   */
  async getUser(userId: string): Promise<BTCPayUser> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would get BTCPay user:', { userId });
      return this.mockUser('dryrun@example.com');
    }
    return super.getUser(userId);
  }

  /**
   * Override deleteUser to support dry-run
   */
  async deleteUser(userId: string): Promise<void> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would delete BTCPay user:', { userId });
      return;
    }
    return super.deleteUser(userId);
  }

  /**
   * Override createStore to support dry-run
   */
  async createStore(name: string, website?: string): Promise<BTCPayStore> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would create BTCPay store:', { name, website });
      return this.mockStore(name);
    }
    return super.createStore(name, website);
  }

  /**
   * Override getStore to support dry-run
   */
  async getStore(storeId: string): Promise<BTCPayStore> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would get BTCPay store:', { storeId });
      return this.mockStore('Dry Run Store');
    }
    return super.getStore(storeId);
  }

  /**
   * Override updateStore to support dry-run
   */
  async updateStore(storeId: string, updates: Partial<BTCPayStore>): Promise<BTCPayStore> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would update BTCPay store:', { storeId, updates });
      return this.mockStore('Updated Store');
    }
    return super.updateStore(storeId, updates);
  }

  /**
   * Override deleteStore to support dry-run
   */
  async deleteStore(storeId: string): Promise<void> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would delete BTCPay store:', { storeId });
      return;
    }
    return super.deleteStore(storeId);
  }

  /**
   * Override addStoreUser to support dry-run
   */
  async addStoreUser(
    storeId: string,
    userId: string,
    role: 'Owner' | 'Manager' | 'Guest' = 'Owner'
  ): Promise<void> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would add user to store:', { storeId, userId, role });
      return;
    }
    return super.addStoreUser(storeId, userId, role);
  }

  /**
   * Override removeStoreUser to support dry-run
   */
  async removeStoreUser(storeId: string, userId: string): Promise<void> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would remove user from store:', { storeId, userId });
      return;
    }
    return super.removeStoreUser(storeId, userId);
  }

  /**
   * Override getStoreUsers to support dry-run
   */
  async getStoreUsers(storeId: string): Promise<Array<{ userId: string; role: string }>> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would get store users:', { storeId });
      return [{ userId: 'dryrun_user_123', role: 'Owner' }];
    }
    return super.getStoreUsers(storeId);
  }

  /**
   * Override createWebhook to support dry-run
   */
  async createWebhook(storeId: string, url: string, events: string[], secret?: string): Promise<any> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would create webhook:', { storeId, url, events });
      return { id: 'dryrun_webhook_123', url, events };
    }
    return super.createWebhook(storeId, url, events, secret);
  }

  /**
   * Override createShopSetup to support dry-run
   */
  async createShopSetup(
    shopName: string,
    shopEmail: string,
    shopPassword: string,
    website?: string
  ): Promise<{ user: BTCPayUser; store: BTCPayStore }> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would create complete shop setup:', {
        shopName,
        shopEmail,
        website
      });

      return {
        user: this.mockUser(shopEmail),
        store: this.mockStore(shopName)
      };
    }

    return super.createShopSetup(shopName, shopEmail, shopPassword, website);
  }

  /**
   * Override healthCheck to support dry-run
   */
  async healthCheck(): Promise<boolean> {
    if (this.dryRunMode) {
      logger.info('[DRY RUN] Would check BTCPay health');
      return true;
    }
    return super.healthCheck();
  }

  /**
   * Generate mock user for dry-run mode
   */
  private mockUser(email: string): BTCPayUser {
    return {
      id: `dryrun_user_${Date.now()}`,
      email,
      emailConfirmed: true,
      requiresEmailConfirmation: false,
      approved: true,
      roles: ['User']
    };
  }

  /**
   * Generate mock store for dry-run mode
   */
  private mockStore(name: string): BTCPayStore {
    return {
      id: `dryrun_store_${Date.now()}`,
      name,
      website: undefined,
      speedPolicy: 'MediumSpeed',
      defaultCurrency: 'BTC'
    };
  }

  /**
   * Check if dry-run mode is enabled
   */
  isDryRun(): boolean {
    return this.dryRunMode;
  }
}

/**
 * Create BTCPay client with dry-run support
 */
export function createBTCPayDryRunClient(
  hostUrl: string,
  apiKey: string,
  dryRun?: boolean
): BTCPayDryRunClient {
  if (!hostUrl || !apiKey) {
    throw new Error('BTCPay host URL and API key are required');
  }

  return new BTCPayDryRunClient(hostUrl, apiKey, dryRun);
}
