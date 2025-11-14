import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { encryptionService } from '@/lib/encryption';
import { logger } from '@/lib/logger';

/**
 * GET /api/providers/:providerId/settings
 * Get provider settings (requires ownership or admin access)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { providerId: string } }
) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { providerId } = params;

    // Get provider with ownership check
    const provider = await prisma.infrastructureProvider.findFirst({
      where: {
        id: parseInt(providerId),
        ownerId: parseInt(userId) // Only owner can access settings
      },
      include: {
        _count: {
          select: {
            connections: true
          }
        }
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found or access denied' },
        { status: 403 }
      );
    }

    // Return provider settings (without decrypted secrets)
    return NextResponse.json({
      provider: {
        id: provider.id,
        name: provider.name,
        description: provider.description,
        serviceType: provider.serviceType,
        hostUrl: provider.hostUrl,
        contactEmail: provider.contactEmail,
        lightningAddress: provider.lightningAddress,
        onboardingWelcomeText: provider.onboardingWelcomeText,
        onboardingSetupSteps: provider.onboardingSetupSteps,
        onboardingExternalLinks: provider.onboardingExternalLinks,
        onboardingContactInfo: provider.onboardingContactInfo,
        btcpayApiKeySet: !!provider.btcpayApiKey,
        webhookSecretSet: !!provider.webhookSecret,
        connectedShopsCount: provider._count.connections
      }
    });

  } catch (error) {
    logger.error('Error fetching provider settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/providers/:providerId/settings
 * Update provider settings (requires ownership or admin access)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { providerId: string } }
) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { providerId } = params;
    const body = await request.json();

    const {
      name,
      description,
      hostUrl,
      contactEmail,
      lightningAddress,
      onboardingWelcomeText,
      onboardingSetupSteps,
      onboardingExternalLinks,
      onboardingContactInfo,
      btcpayApiKey,
      webhookSecret
    } = body;

    // Verify ownership
    const provider = await prisma.infrastructureProvider.findFirst({
      where: {
        id: parseInt(providerId),
        ownerId: parseInt(userId)
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found or access denied' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name,
      description,
      hostUrl,
      contactEmail,
      lightningAddress,
      onboardingWelcomeText,
      onboardingSetupSteps,
      onboardingExternalLinks,
      onboardingContactInfo
    };

    // Encrypt and update BTCPay API key if provided
    if (btcpayApiKey && btcpayApiKey.trim()) {
      try {
        const encryptedApiKey = encryptionService.encrypt(btcpayApiKey);
        updateData.btcpayApiKey = encryptedApiKey;
        logger.info(`Updated BTCPay API key for provider ${providerId}`);
      } catch (error) {
        logger.error('Failed to encrypt BTCPay API key:', error);
        return NextResponse.json(
          { error: 'Failed to encrypt API key' },
          { status: 500 }
        );
      }
    }

    // Update webhook secret if provided
    if (webhookSecret && webhookSecret.trim()) {
      updateData.webhookSecret = webhookSecret;
      logger.info(`Updated webhook secret for provider ${providerId}`);
    }

    // Update provider
    const updatedProvider = await prisma.infrastructureProvider.update({
      where: { id: parseInt(providerId) },
      data: updateData
    });

    logger.info(`Provider ${providerId} settings updated successfully`);

    return NextResponse.json({
      success: true,
      provider: {
        id: updatedProvider.id,
        name: updatedProvider.name,
        description: updatedProvider.description
      }
    });

  } catch (error) {
    logger.error('Error updating provider settings:', error);
    return NextResponse.json(
      { error: 'Failed to update provider settings' },
      { status: 500 }
    );
  }
}
