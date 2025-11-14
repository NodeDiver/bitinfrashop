import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createBTCPayClient } from '@/lib/btcpay-client';
import { encryptionService } from '@/lib/encryption';
import { connectionPaymentService } from '@/lib/connection-payment-service';
import { logger } from '@/lib/logger';

/**
 * POST /api/connections/:id/retry
 * Retry a failed connection setup (BTCPay or NWC payment)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get connection with ownership check
    const connection = await prisma.connection.findFirst({
      where: {
        id: parseInt(id),
        shop: {
          ownerId: parseInt(userId)
        }
      },
      include: {
        shop: true,
        provider: true
      }
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found or access denied' },
        { status: 404 }
      );
    }

    // Check if connection can be retried
    if (connection.status !== 'FAILED' && connection.status !== 'PENDING_SETUP') {
      return NextResponse.json(
        { error: 'Connection is not in a failed state' },
        { status: 400 }
      );
    }

    // Check retry limit
    const maxRetries = 5;
    if (connection.retryCount >= maxRetries) {
      return NextResponse.json(
        { error: `Maximum retry attempts (${maxRetries}) exceeded. Please contact support.` },
        { status: 400 }
      );
    }

    logger.info(`Retrying connection ${connection.id} (attempt ${connection.retryCount + 1})`);

    // Update retry count
    await prisma.connection.update({
      where: { id: connection.id },
      data: {
        retryCount: connection.retryCount + 1,
        status: 'PENDING'
      }
    });

    // Determine retry type based on connection and provider
    const retryResult = await retryConnection(connection);

    if (retryResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Connection retry successful',
        status: retryResult.status,
        btcpayCredentials: retryResult.btcpayCredentials
      });
    } else {
      return NextResponse.json({
        success: false,
        error: retryResult.error,
        canRetryAgain: connection.retryCount + 1 < maxRetries
      }, { status: 500 });
    }

  } catch (error) {
    logger.error('Error retrying connection:', error);
    return NextResponse.json(
      { error: 'Failed to retry connection' },
      { status: 500 }
    );
  }
}

/**
 * Retry connection based on provider type and connection status
 */
async function retryConnection(connection: any): Promise<{
  success: boolean;
  error?: string;
  status?: string;
  btcpayCredentials?: any;
}> {
  try {
    // If it's a BTCPay connection, retry Greenfield setup
    if (connection.provider.serviceType === 'BTCPAY_SERVER') {
      return await retryBTCPaySetup(connection);
    }

    // If it's a paid connection with NWC, retry payment
    if (connection.connectionType === 'PAID_SUBSCRIPTION' && connection.nwcConnectionString) {
      return await retryNWCPayment(connection);
    }

    // Unknown retry type
    return {
      success: false,
      error: 'Unable to determine retry method for this connection'
    };

  } catch (error) {
    logger.error('Error in retryConnection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Retry BTCPay Greenfield API setup
 */
async function retryBTCPaySetup(connection: any): Promise<{
  success: boolean;
  error?: string;
  status?: string;
  btcpayCredentials?: any;
}> {
  try {
    const provider = connection.provider;
    const shop = connection.shop;

    if (!provider.hostUrl || !provider.btcpayApiKey) {
      return {
        success: false,
        error: 'Provider BTCPay configuration incomplete'
      };
    }

    // Decrypt API key
    const apiKey = encryptionService.decrypt(provider.btcpayApiKey);

    // Create BTCPay client
    const btcpayClient = createBTCPayClient(provider.hostUrl, apiKey);

    // Generate credentials
    const username = shop.btcpayUsername || `${shop.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${shop.id}`;
    const tempPassword = generateSecurePassword();
    const shopEmail = shop.contactEmail || shop.lightningAddress || `${username}@temp.placeholder`;

    // Attempt setup
    const setupResult = await btcpayClient.createShopSetup(
      shop.name,
      shopEmail,
      tempPassword,
      shop.website || undefined
    );

    // Update shop with BTCPay credentials
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        btcpayStoreId: setupResult.store.id,
        btcpayUserId: setupResult.user.id,
        btcpayUsername: username
      }
    });

    // Mark connection as ACTIVE
    await prisma.connection.update({
      where: { id: connection.id },
      data: {
        status: 'ACTIVE',
        setupError: null
      }
    });

    logger.info(`BTCPay setup retry successful for connection ${connection.id}`);

    return {
      success: true,
      status: 'ACTIVE',
      btcpayCredentials: {
        storeId: setupResult.store.id,
        userId: setupResult.user.id,
        username,
        tempPassword
      }
    };

  } catch (error) {
    logger.error('BTCPay setup retry failed:', error);

    // Update connection with error
    await prisma.connection.update({
      where: { id: connection.id },
      data: {
        status: 'FAILED',
        setupError: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'BTCPay setup failed'
    };
  }
}

/**
 * Retry NWC payment
 */
async function retryNWCPayment(connection: any): Promise<{
  success: boolean;
  error?: string;
  status?: string;
}> {
  try {
    // Use the connection payment service retry method
    const paymentResult = await connectionPaymentService.retryConnectionPayment(connection.id);

    if (paymentResult.success) {
      logger.info(`NWC payment retry successful for connection ${connection.id}`);
      return {
        success: true,
        status: 'ACTIVE'
      };
    } else {
      logger.error(`NWC payment retry failed for connection ${connection.id}:`, paymentResult.error);
      return {
        success: false,
        error: paymentResult.error || 'Payment failed'
      };
    }

  } catch (error) {
    logger.error('NWC payment retry error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment retry failed'
    };
  }
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}
