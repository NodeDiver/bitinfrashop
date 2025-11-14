import { logger } from './logger';

/**
 * BTCPay Server Greenfield API Client
 *
 * Documentation: https://docs.btcpayserver.org/API/Greenfield/v1/
 */

export interface BTCPayUser {
  id: string;
  email: string;
  emailConfirmed: boolean;
  requiresEmailConfirmation: boolean;
  approved: boolean;
  roles: string[];
}

export interface BTCPayStore {
  id: string;
  name: string;
  website?: string;
  speedPolicy?: string;
  defaultCurrency?: string;
}

export interface BTCPayStoreRole {
  storeId: string;
  role: 'Owner' | 'Manager' | 'Guest';
}

export class BTCPayClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(hostUrl: string, apiKey: string) {
    // Ensure URL doesn't end with slash
    this.baseUrl = hostUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  /**
   * Make authenticated request to Greenfield API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    logger.info(`BTCPay API: ${method} ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${this.apiKey}`
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`BTCPay API error: ${response.status} ${errorText}`);
        throw new Error(`BTCPay API error: ${response.status} - ${errorText}`);
      }

      // Some endpoints return no content (204)
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      logger.error('BTCPay API request failed:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * POST /api/v1/users
   */
  async createUser(email: string, password: string): Promise<BTCPayUser> {
    return this.request<BTCPayUser>('POST', '/api/v1/users', {
      email,
      password,
      isAdministrator: false
    });
  }

  /**
   * Get user by ID
   * GET /api/v1/users/{userId}
   */
  async getUser(userId: string): Promise<BTCPayUser> {
    return this.request<BTCPayUser>('GET', `/api/v1/users/${userId}`);
  }

  /**
   * Delete user
   * DELETE /api/v1/users/{userId}
   */
  async deleteUser(userId: string): Promise<void> {
    await this.request('DELETE', `/api/v1/users/${userId}`);
  }

  /**
   * Create a new store
   * POST /api/v1/stores
   */
  async createStore(name: string, website?: string): Promise<BTCPayStore> {
    return this.request<BTCPayStore>('POST', '/api/v1/stores', {
      name,
      website,
      defaultCurrency: 'BTC'
    });
  }

  /**
   * Get store by ID
   * GET /api/v1/stores/{storeId}
   */
  async getStore(storeId: string): Promise<BTCPayStore> {
    return this.request<BTCPayStore>('GET', `/api/v1/stores/${storeId}`);
  }

  /**
   * Update store
   * PUT /api/v1/stores/{storeId}
   */
  async updateStore(storeId: string, updates: Partial<BTCPayStore>): Promise<BTCPayStore> {
    return this.request<BTCPayStore>('PUT', `/api/v1/stores/${storeId}`, updates);
  }

  /**
   * Delete store
   * DELETE /api/v1/stores/{storeId}
   */
  async deleteStore(storeId: string): Promise<void> {
    await this.request('DELETE', `/api/v1/stores/${storeId}`);
  }

  /**
   * Add user to store with specific role
   * POST /api/v1/stores/{storeId}/users
   */
  async addStoreUser(
    storeId: string,
    userId: string,
    role: 'Owner' | 'Manager' | 'Guest' = 'Owner'
  ): Promise<void> {
    await this.request('POST', `/api/v1/stores/${storeId}/users`, {
      userId,
      role
    });
  }

  /**
   * Remove user from store
   * DELETE /api/v1/stores/{storeId}/users/{userId}
   */
  async removeStoreUser(storeId: string, userId: string): Promise<void> {
    await this.request('DELETE', `/api/v1/stores/${storeId}/users/${userId}`);
  }

  /**
   * Get all users for a store
   * GET /api/v1/stores/{storeId}/users
   */
  async getStoreUsers(storeId: string): Promise<Array<{ userId: string; role: string }>> {
    return this.request('GET', `/api/v1/stores/${storeId}/users`);
  }

  /**
   * Create webhook for store
   * POST /api/v1/stores/{storeId}/webhooks
   */
  async createWebhook(storeId: string, url: string, events: string[], secret?: string): Promise<any> {
    return this.request('POST', `/api/v1/stores/${storeId}/webhooks`, {
      url,
      authorizedEvents: {
        everything: false,
        specificEvents: events
      },
      secret
    });
  }

  /**
   * Complete shop setup flow: create user, store, and assign ownership
   */
  async createShopSetup(
    shopName: string,
    shopEmail: string,
    shopPassword: string,
    website?: string
  ): Promise<{
    user: BTCPayUser;
    store: BTCPayStore;
  }> {
    try {
      // Step 1: Create user
      logger.info(`Creating BTCPay user for ${shopEmail}`);
      const user = await this.createUser(shopEmail, shopPassword);

      // Step 2: Create store
      logger.info(`Creating BTCPay store: ${shopName}`);
      const store = await this.createStore(shopName, website);

      // Step 3: Add user to store as Owner
      logger.info(`Adding user ${user.id} to store ${store.id} as Owner`);
      await this.addStoreUser(store.id, user.id, 'Owner');

      return { user, store };
    } catch (error) {
      logger.error('BTCPay shop setup failed:', error);
      throw new Error(`Failed to set up shop on BTCPay Server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check - verify API key is valid
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to access a simple endpoint
      await this.request('GET', '/api/v1/health');
      return true;
    } catch (error) {
      logger.error('BTCPay health check failed:', error);
      return false;
    }
  }
}

/**
 * Create BTCPay client from encrypted API key
 */
export function createBTCPayClient(hostUrl: string, apiKey: string): BTCPayClient {
  if (!hostUrl || !apiKey) {
    throw new Error('BTCPay host URL and API key are required');
  }

  return new BTCPayClient(hostUrl, apiKey);
}
