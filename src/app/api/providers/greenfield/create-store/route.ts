import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createBTCPayClient } from '@/lib/btcpay-client';
import { encryptionService } from '@/lib/encryption';
import { logger } from '@/lib/logger';

/**
 * POST /api/providers/greenfield/create-store
 * Create a store on BTCPay Server via Greenfield API
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { shopId, providerId, shopName, shopEmail } = body;

    // Validation
    if (!shopId || !providerId || !shopName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify shop belongs to user
    const shop = await prisma.shop.findFirst({
      where: {
        id: parseInt(shopId),
        ownerId: parseInt(userId)
      }
    });

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found or access denied' },
        { status: 404 }
      );
    }

    // Get provider details with encrypted API key
    const provider = await prisma.infrastructureProvider.findUnique({
      where: { id: parseInt(providerId) }
    });

    if (!provider || provider.serviceType !== 'BTCPAY_SERVER') {
      return NextResponse.json(
        { error: 'Invalid BTCPay provider' },
        { status: 400 }
      );
    }

    if (!provider.hostUrl) {
      return NextResponse.json(
        { error: 'Provider host URL not configured' },
        { status: 500 }
      );
    }

    if (!provider.btcpayApiKey) {
      return NextResponse.json(
        { error: 'Provider BTCPay API key not configured' },
        { status: 500 }
      );
    }

    // Decrypt API key
    let apiKey: string;
    try {
      apiKey = encryptionService.decrypt(provider.btcpayApiKey);
    } catch (error) {
      logger.error('Failed to decrypt BTCPay API key:', error);
      return NextResponse.json(
        { error: 'Failed to decrypt provider API key' },
        { status: 500 }
      );
    }

    // Generate username and password
    const username = shopName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + shopId;
    const tempPassword = generateSecurePassword();

    // Create BTCPay client
    const btcpayClient = createBTCPayClient(provider.hostUrl, apiKey);

    // Attempt to create shop setup (with retry logic)
    let setupResult;
    let setupError: string | null = null;
    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries) {
      try {
        logger.info(`Creating BTCPay shop setup for ${shopName} (attempt ${retryCount + 1}/${maxRetries + 1})`);

        setupResult = await btcpayClient.createShopSetup(
          shopName,
          shopEmail || `${username}@temp.placeholder`,
          tempPassword,
          shop.website || undefined
        );

        // Success! Break out of retry loop
        logger.info(`Successfully created BTCPay shop setup for ${shopName}`);
        break;

      } catch (error) {
        setupError = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`BTCPay shop setup failed (attempt ${retryCount + 1}):`, error);

        if (retryCount < maxRetries) {
          // Wait 5 seconds before retry
          logger.info('Retrying in 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          retryCount++;
        } else {
          // Max retries reached, mark as failed
          logger.error(`Max retries reached for BTCPay shop setup: ${shopName}`);

          // Find and update the connection record
          const connection = await prisma.connection.findFirst({
            where: {
              shopId: parseInt(shopId),
              providerId: parseInt(providerId)
            }
          });

          if (connection) {
            await prisma.connection.update({
              where: { id: connection.id },
              data: {
                status: 'PENDING_SETUP',
                setupError: setupError,
                retryCount: retryCount
              }
            });
          }

          return NextResponse.json(
            {
              error: 'Failed to create BTCPay store after retries',
              details: setupError,
              canRetry: true
            },
            { status: 500 }
          );
        }
      }
    }

    // Update shop with BTCPay credentials
    await prisma.shop.update({
      where: { id: parseInt(shopId) },
      data: {
        btcpayStoreId: setupResult!.store.id,
        btcpayUserId: setupResult!.user.id,
        btcpayUsername: username
      }
    });

    // Update connection status to ACTIVE
    const connection = await prisma.connection.findFirst({
      where: {
        shopId: parseInt(shopId),
        providerId: parseInt(providerId)
      }
    });

    if (connection) {
      await prisma.connection.update({
        where: { id: connection.id },
        data: {
          status: 'ACTIVE',
          setupError: null,
          retryCount: 0
        }
      });
    }

    // Store temp password in secure session (expires after 1 hour)
    const response = NextResponse.json({
      success: true,
      storeId: setupResult!.store.id,
      userId: setupResult!.user.id,
      username,
      tempPassword
    });

    // Set temporary cookie with password (for onboarding page)
    response.cookies.set(`btcpay_temp_pwd_${shopId}`, tempPassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 // 1 hour
    });

    return response;

  } catch (error) {
    logger.error('Greenfield API error:', error);
    return NextResponse.json(
      { error: 'Failed to create BTCPay store' },
      { status: 500 }
    );
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
