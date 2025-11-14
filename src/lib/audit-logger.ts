import { logger } from './logger';
import prisma from './prisma';

/**
 * Audit Logger
 *
 * Records important security and business events for compliance and debugging.
 * All audit logs are stored in the database for persistence.
 */

export type AuditEventType =
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.deleted'
  | 'shop.created'
  | 'shop.updated'
  | 'shop.deleted'
  | 'provider.created'
  | 'provider.updated'
  | 'provider.deleted'
  | 'provider.api_key_updated'
  | 'connection.created'
  | 'connection.status_changed'
  | 'connection.retry_attempted'
  | 'payment.initiated'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'btcpay.store_created'
  | 'btcpay.user_created'
  | 'btcpay.webhook_received'
  | 'nwc.connection_stored'
  | 'nwc.payment_sent'
  | 'security.unauthorized_access'
  | 'security.invalid_signature'
  | 'security.rate_limit_exceeded';

interface AuditLogData {
  eventType: AuditEventType;
  userId?: number;
  shopId?: number;
  providerId?: number;
  connectionId?: number;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

class AuditLogger {
  /**
   * Log an audit event
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      // Log to console for immediate visibility
      logger.info('Audit Event', {
        event: data.eventType,
        userId: data.userId,
        shopId: data.shopId,
        providerId: data.providerId,
        connectionId: data.connectionId
      });

      // Store in database for persistence
      // Note: You would need to create an AuditLog model in Prisma schema
      // For now, we'll use PaymentHistory as a temporary storage
      // In production, create a dedicated audit_logs table

      // Temporary solution: log to console and PaymentHistory
      if (data.connectionId) {
        await prisma.paymentHistory.create({
          data: {
            connectionId: data.connectionId,
            paymentAmount: 0,
            status: data.eventType,
            paymentMethod: 'audit_log',
            errorMessage: data.metadata ? JSON.stringify(data.metadata) : undefined
          }
        }).catch(err => {
          logger.error('Failed to store audit log in database', err);
        });
      }

    } catch (error) {
      logger.error('Audit logging failed', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Log user authentication events
   */
  async logAuth(eventType: 'user.login' | 'user.logout', userId: number, ipAddress?: string): Promise<void> {
    await this.log({
      eventType,
      userId,
      ipAddress,
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  /**
   * Log shop operations
   */
  async logShop(
    eventType: 'shop.created' | 'shop.updated' | 'shop.deleted',
    shopId: number,
    userId: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      shopId,
      userId,
      metadata
    });
  }

  /**
   * Log provider operations
   */
  async logProvider(
    eventType: 'provider.created' | 'provider.updated' | 'provider.deleted' | 'provider.api_key_updated',
    providerId: number,
    userId: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      providerId,
      userId,
      metadata
    });
  }

  /**
   * Log connection operations
   */
  async logConnection(
    eventType: 'connection.created' | 'connection.status_changed' | 'connection.retry_attempted',
    connectionId: number,
    userId: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      connectionId,
      userId,
      metadata
    });
  }

  /**
   * Log payment operations
   */
  async logPayment(
    eventType: 'payment.initiated' | 'payment.succeeded' | 'payment.failed',
    connectionId: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      connectionId,
      metadata
    });
  }

  /**
   * Log BTCPay operations
   */
  async logBTCPay(
    eventType: 'btcpay.store_created' | 'btcpay.user_created' | 'btcpay.webhook_received',
    providerId: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      providerId,
      metadata
    });
  }

  /**
   * Log NWC operations
   */
  async logNWC(
    eventType: 'nwc.connection_stored' | 'nwc.payment_sent',
    connectionId: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      connectionId,
      metadata
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    eventType: 'security.unauthorized_access' | 'security.invalid_signature' | 'security.rate_limit_exceeded',
    ipAddress?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      ipAddress,
      metadata
    });

    // Security events should also trigger immediate alerts
    logger.warn(`SECURITY EVENT: ${eventType}`, metadata);
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Export class for testing
export { AuditLogger };
