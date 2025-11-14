import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { encryptionService } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { auditLogger } from '@/lib/audit-logger';
import { featureFlags } from '@/lib/feature-flags';
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

/**
 * POST /api/webhooks/btcpay
 * Handle BTCPay Server webhooks
 *
 * Supported events:
 * - Store modified
 * - User removed from store
 * - Store deleted
 */
export async function POST(request: NextRequest) {
  try {
    // Check if webhooks are enabled
    if (featureFlags.isDisabled('provider_webhooks')) {
      logger.warn('BTCPay webhooks are disabled via feature flag');
      return NextResponse.json(
        { error: 'Webhooks are currently disabled' },
        { status: 503 }
      );
    }

    // Apply rate limiting by IP address
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = await applyRateLimit(`webhook:${ipAddress}`, RATE_LIMITS.webhook);
    if (!rateLimitResult.allowed) {
      logger.warn('BTCPay webhook: Rate limit exceeded', { ipAddress });
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('btcpay-sig');

    if (!signature) {
      logger.error('BTCPay webhook: Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      logger.error('BTCPay webhook: Invalid JSON payload');
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    // Extract storeId and event type
    const { storeId, type, timestamp, ...eventData } = payload;

    if (!storeId || !type) {
      logger.error('BTCPay webhook: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    logger.info(`Received BTCPay webhook: ${type} for store ${storeId}`, {
      storeId,
      type,
      timestamp,
      ipAddress
    });

    // Find the shop and provider by BTCPay store ID
    const shop = await prisma.shop.findFirst({
      where: {
        btcpayStoreId: storeId
      },
      include: {
        connections: {
          include: {
            provider: true
          }
        }
      }
    });

    if (!shop) {
      logger.warn(`BTCPay webhook: Shop not found for store ${storeId}`);
      // Return 200 to acknowledge webhook even if shop not found
      return NextResponse.json({ received: true });
    }

    // Find the BTCPay provider connection
    const connection = shop.connections.find(
      conn => conn.provider.serviceType === 'BTCPAY_SERVER' && conn.provider.hostUrl
    );

    if (!connection) {
      logger.warn(`BTCPay webhook: No BTCPay connection found for shop ${shop.id}`);
      return NextResponse.json({ received: true });
    }

    const provider = connection.provider;

    // Verify webhook signature
    if (provider.webhookSecret) {
      const isValid = verifyWebhookSignature(body, signature, provider.webhookSecret);
      if (!isValid) {
        logger.error('BTCPay webhook: Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else {
      logger.warn('BTCPay webhook: No webhook secret configured for provider, skipping verification');
    }

    // Handle different event types
    switch (type) {
      case 'store.modified':
        await handleStoreModified(shop, connection, eventData);
        break;

      case 'store.user.removed':
        await handleUserRemoved(shop, connection, eventData);
        break;

      case 'store.deleted':
        await handleStoreDeleted(shop, connection, eventData);
        break;

      default:
        logger.info(`BTCPay webhook: Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    logger.error('Error processing BTCPay webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Verify webhook signature using HMAC
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // BTCPay sends signature in format: sha256=<hash>
    const [algorithm, hash] = signature.split('=');

    if (algorithm !== 'sha256') {
      logger.error(`Unsupported signature algorithm: ${algorithm}`);
      return false;
    }

    // Calculate expected signature
    const expectedHash = encryptionService.hmacSha256(payload, secret);

    // Secure comparison
    return encryptionService.secureCompare(hash, expectedHash);

  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Handle store.modified event
 * Store settings or metadata was changed
 */
async function handleStoreModified(
  shop: any,
  connection: any,
  eventData: any
): Promise<void> {
  try {
    logger.info(`Handling store.modified for shop ${shop.id}`);

    // Log the modification
    await prisma.paymentHistory.create({
      data: {
        connectionId: connection.id,
        paymentAmount: 0,
        status: 'store_modified_webhook',
        paymentMethod: 'btcpay_webhook'
      }
    });

    // Optionally sync store data from BTCPay
    // This could involve fetching updated store info via Greenfield API

    logger.info(`Store modification logged for shop ${shop.id}`);

  } catch (error) {
    logger.error('Error handling store.modified event:', error);
  }
}

/**
 * Handle store.user.removed event
 * User was removed from the store
 */
async function handleUserRemoved(
  shop: any,
  connection: any,
  eventData: any
): Promise<void> {
  try {
    logger.info(`Handling store.user.removed for shop ${shop.id}`);

    const { userId } = eventData;

    // Check if the removed user is the shop's BTCPay user
    if (userId === shop.btcpayUserId) {
      // Mark connection as DISCONNECTED
      await prisma.connection.update({
        where: { id: connection.id },
        data: {
          status: 'DISCONNECTED',
          setupError: 'User was removed from BTCPay store'
        }
      });

      // Log the event
      await prisma.paymentHistory.create({
        data: {
          connectionId: connection.id,
          paymentAmount: 0,
          status: 'user_removed_webhook',
          paymentMethod: 'btcpay_webhook',
          errorMessage: `User ${userId} removed from store`
        }
      });

      logger.warn(`Shop ${shop.id} user removed from BTCPay store, connection marked as DISCONNECTED`);
    } else {
      logger.info(`Different user ${userId} removed from store, no action needed`);
    }

  } catch (error) {
    logger.error('Error handling store.user.removed event:', error);
  }
}

/**
 * Handle store.deleted event
 * Store was deleted from BTCPay Server
 */
async function handleStoreDeleted(
  shop: any,
  connection: any,
  eventData: any
): Promise<void> {
  try {
    logger.info(`Handling store.deleted for shop ${shop.id}`);

    // Mark connection as DISCONNECTED
    await prisma.connection.update({
      where: { id: connection.id },
      data: {
        status: 'DISCONNECTED',
        setupError: 'Store was deleted from BTCPay Server'
      }
    });

    // Clear BTCPay credentials from shop
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        btcpayStoreId: null,
        btcpayUserId: null,
        btcpayUsername: null
      }
    });

    // Log the event
    await prisma.paymentHistory.create({
      data: {
        connectionId: connection.id,
        paymentAmount: 0,
        status: 'store_deleted_webhook',
        paymentMethod: 'btcpay_webhook',
        errorMessage: 'Store deleted from BTCPay Server'
      }
    });

    logger.warn(`Shop ${shop.id} store deleted from BTCPay Server, connection disconnected`);

  } catch (error) {
    logger.error('Error handling store.deleted event:', error);
  }
}
