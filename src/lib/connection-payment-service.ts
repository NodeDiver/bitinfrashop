import { logger } from './logger';
import { encryptionService } from './encryption';
import prisma from './prisma';
import crypto from 'crypto';

/**
 * Connection Payment Service
 *
 * Handles NWC payments for shop-to-provider connections.
 * Initiates immediate payments when shops subscribe to providers.
 */

interface PaymentResult {
  success: boolean;
  preimage?: string;
  paymentId?: string;
  error?: string;
  amount?: number;
  recipient?: string;
}

class ConnectionPaymentService {
  /**
   * Initiate first payment for a new connection
   */
  async initiateConnectionPayment(
    connectionId: number,
    nwcConnectionString: string
  ): Promise<PaymentResult> {
    try {
      // Get connection details
      const connection = await prisma.connection.findUnique({
        where: { id: connectionId },
        include: {
          provider: true,
          shop: true
        }
      });

      if (!connection) {
        return {
          success: false,
          error: 'Connection not found'
        };
      }

      if (!connection.subscriptionAmount) {
        return {
          success: false,
          error: 'No subscription amount configured'
        };
      }

      // Get provider's lightning address
      const recipientLightningAddress = connection.provider.lightningAddress;
      if (!recipientLightningAddress) {
        return {
          success: false,
          error: 'Provider lightning address not configured'
        };
      }

      // Encrypt and store NWC connection string
      const encryptedNWC = encryptionService.encrypt(nwcConnectionString);
      await prisma.connection.update({
        where: { id: connectionId },
        data: {
          nwcConnectionString: encryptedNWC
        }
      });

      // Process the payment
      const paymentResult = await this.sendNWCPayment({
        nwcConnectionString,
        amountSats: connection.subscriptionAmount,
        recipientLightningAddress,
        description: `${connection.shop.name} subscription to ${connection.provider.name}`
      });

      if (paymentResult.success) {
        // Record successful payment
        await prisma.paymentHistory.create({
          data: {
            connectionId: connection.id,
            paymentAmount: connection.subscriptionAmount,
            status: 'success',
            paymentMethod: 'NWC',
            walletProvider: this.extractWalletProvider(nwcConnectionString),
            preimage: paymentResult.preimage
          }
        });

        // Update connection with payment ID and mark as ACTIVE
        await prisma.connection.update({
          where: { id: connectionId },
          data: {
            nwcPaymentId: paymentResult.paymentId,
            status: 'ACTIVE'
          }
        });

        logger.info(`Payment successful for connection ${connectionId}: ${connection.subscriptionAmount} sats to ${recipientLightningAddress}`);
      } else {
        // Record failed payment
        await prisma.paymentHistory.create({
          data: {
            connectionId: connection.id,
            paymentAmount: connection.subscriptionAmount,
            status: 'failed',
            paymentMethod: 'NWC',
            walletProvider: this.extractWalletProvider(nwcConnectionString),
            errorMessage: paymentResult.error
          }
        });

        // Mark connection as FAILED
        await prisma.connection.update({
          where: { id: connectionId },
          data: {
            status: 'FAILED',
            setupError: `Payment failed: ${paymentResult.error}`
          }
        });

        logger.error(`Payment failed for connection ${connectionId}:`, paymentResult.error);
      }

      return paymentResult;

    } catch (error) {
      logger.error('Error initiating connection payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send payment via NWC connection
   */
  private async sendNWCPayment(params: {
    nwcConnectionString: string;
    amountSats: number;
    recipientLightningAddress: string;
    description: string;
  }): Promise<PaymentResult> {
    try {
      // Parse NWC connection string
      const nwcInfo = this.parseNWCConnectionString(params.nwcConnectionString);

      // Generate invoice from lightning address
      const invoice = await this.generateInvoiceFromLightningAddress(
        params.recipientLightningAddress,
        params.amountSats,
        params.description
      );

      if (!invoice) {
        return {
          success: false,
          error: 'Failed to generate invoice from lightning address'
        };
      }

      // Send payment via NWC (simplified - in production use NWC library)
      const paymentResult = await this.sendPaymentViaNWC(nwcInfo, invoice);

      return {
        success: paymentResult.success,
        preimage: paymentResult.preimage,
        paymentId: paymentResult.paymentId,
        error: paymentResult.error,
        amount: params.amountSats,
        recipient: params.recipientLightningAddress
      };

    } catch (error) {
      logger.error('Error sending NWC payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Parse NWC connection string
   */
  private parseNWCConnectionString(connectionString: string): {
    relayUrl: string;
    secret: string;
  } {
    try {
      // Parse nostr+walletconnect:// format
      const url = new URL(connectionString);
      const relayUrl = `${url.protocol}//${url.host}${url.pathname}`;
      const secret = url.searchParams.get('secret') || url.hash.slice(1);

      if (!secret) {
        throw new Error('Invalid NWC connection string: missing secret');
      }

      return { relayUrl, secret };
    } catch (error) {
      logger.error('Error parsing NWC connection string:', error);
      throw new Error('Invalid NWC connection string format');
    }
  }

  /**
   * Generate invoice from lightning address
   */
  private async generateInvoiceFromLightningAddress(
    lightningAddress: string,
    amountSats: number,
    description: string
  ): Promise<string | null> {
    try {
      // Extract domain and username from lightning address
      const [username, domain] = lightningAddress.split('@');

      if (!username || !domain) {
        throw new Error('Invalid lightning address format');
      }

      // Call lightning address API to get LNURL info
      const lnurlResponse = await fetch(`https://${domain}/.well-known/lnurlp/${username}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!lnurlResponse.ok) {
        throw new Error(`Failed to fetch lightning address info: ${lnurlResponse.statusText}`);
      }

      const lnurlData = await lnurlResponse.json();

      if (!lnurlData.callback) {
        throw new Error('Invalid lnurl response: missing callback');
      }

      // Request invoice (amount in millisats)
      const amountMsats = amountSats * 1000;
      const invoiceUrl = `${lnurlData.callback}?amount=${amountMsats}&comment=${encodeURIComponent(description)}`;

      const invoiceResponse = await fetch(invoiceUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!invoiceResponse.ok) {
        throw new Error(`Failed to generate invoice: ${invoiceResponse.statusText}`);
      }

      const invoiceData = await invoiceResponse.json();

      if (!invoiceData.pr) {
        throw new Error('Invalid invoice response: missing payment request');
      }

      return invoiceData.pr;

    } catch (error) {
      logger.error('Error generating invoice from lightning address:', error);
      return null;
    }
  }

  /**
   * Send payment via NWC connection
   *
   * NOTE: This is a simplified mock implementation for development.
   * In production, replace with actual NWC library (e.g., nwc-js, webln, etc.)
   */
  private async sendPaymentViaNWC(
    nwcInfo: { relayUrl: string; secret: string },
    invoice: string
  ): Promise<PaymentResult> {
    try {
      logger.info('Sending NWC payment...', {
        relayUrl: nwcInfo.relayUrl,
        invoice: invoice.substring(0, 50) + '...'
      });

      // TODO: Replace with actual NWC implementation
      // This would involve:
      // 1. Connecting to the NWC relay (Nostr relay)
      // 2. Authenticating with the wallet service
      // 3. Sending pay_invoice NIP-47 request
      // 4. Waiting for payment confirmation
      // 5. Extracting preimage from response

      // For now, simulate successful payment
      const preimage = crypto.randomBytes(32).toString('hex');
      const paymentId = `nwc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      return {
        success: true,
        preimage,
        paymentId
      };

    } catch (error) {
      logger.error('Error sending payment via NWC:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract wallet provider name from NWC connection string
   */
  private extractWalletProvider(nwcConnectionString: string): string {
    try {
      const url = new URL(nwcConnectionString);
      const hostname = url.hostname.toLowerCase();

      // Try to identify wallet provider from hostname
      if (hostname.includes('getalby')) return 'Alby';
      if (hostname.includes('mutiny')) return 'Mutiny';
      if (hostname.includes('zeus')) return 'Zeus';
      if (hostname.includes('wallet.strike')) return 'Strike';

      return 'Unknown NWC Wallet';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Retry failed connection payment
   */
  async retryConnectionPayment(connectionId: number): Promise<PaymentResult> {
    try {
      const connection = await prisma.connection.findUnique({
        where: { id: connectionId },
        include: {
          provider: true,
          shop: true
        }
      });

      if (!connection) {
        return {
          success: false,
          error: 'Connection not found'
        };
      }

      if (!connection.nwcConnectionString) {
        return {
          success: false,
          error: 'NWC connection string not found'
        };
      }

      // Decrypt NWC connection string
      const nwcConnectionString = encryptionService.decrypt(connection.nwcConnectionString);

      // Retry payment
      return await this.initiateConnectionPayment(connectionId, nwcConnectionString);

    } catch (error) {
      logger.error('Error retrying connection payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const connectionPaymentService = new ConnectionPaymentService();

// Export types
export type { PaymentResult };
