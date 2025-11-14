import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/onboarding/:providerId/:shopId
 * Get onboarding information for a shop-provider connection
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { providerId: string; shopId: string } }
) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { providerId, shopId } = params;

    // Verify shop exists and belongs to user
    const shop = await prisma.shop.findFirst({
      where: {
        id: parseInt(shopId),
        ownerId: parseInt(userId)
      },
      select: {
        id: true,
        name: true,
        btcpayUsername: true,
        // Note: We'll fetch the temp password from a separate secure storage
        // For now, we'll generate a placeholder or fetch from session
      }
    });

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found or access denied' },
        { status: 404 }
      );
    }

    // Get provider information
    const provider = await prisma.infrastructureProvider.findUnique({
      where: { id: parseInt(providerId) },
      select: {
        id: true,
        name: true,
        serviceType: true,
        hostUrl: true,
        onboardingWelcomeText: true,
        onboardingSetupSteps: true,
        onboardingExternalLinks: true,
        onboardingContactInfo: true
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Get temp password from session/cache if available
    // For security, temp passwords should not be stored in DB
    // This is a simplified version - in production, use secure session storage
    const tempPassword = request.cookies.get(`btcpay_temp_pwd_${shopId}`)?.value || '(Check your email or contact provider)';

    return NextResponse.json({
      provider: {
        id: provider.id,
        name: provider.name,
        service_type: provider.serviceType,
        host_url: provider.hostUrl,
        onboarding_welcome_text: provider.onboardingWelcomeText,
        onboarding_setup_steps: provider.onboardingSetupSteps,
        onboarding_external_links: provider.onboardingExternalLinks,
        onboarding_contact_info: provider.onboardingContactInfo
      },
      shop: {
        id: shop.id,
        name: shop.name,
        btcpay_username: shop.btcpayUsername,
        btcpay_password: tempPassword
      }
    });

  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding information' },
      { status: 500 }
    );
  }
}
