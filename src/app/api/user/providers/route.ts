import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/user/providers - Get only the authenticated user's infrastructure providers
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const providers = await prisma.infrastructureProvider.findMany({
      where: {
        ownerId: parseInt(userId)
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            name: true
          }
        },
        connections: {
          where: { status: 'ACTIVE' },
          include: {
            shop: {
              select: {
                id: true,
                name: true,
                shopType: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform data for response
    const transformedProviders = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      service_type: provider.serviceType,
      website: provider.website,
      contact_email: provider.contactEmail,
      lightning_address: provider.lightningAddress,
      pricing_tiers: provider.pricingTiers,
      technical_specs: provider.technicalSpecs,
      is_public: provider.isPublic,
      supports_nwc: provider.supportsNwc,
      slots_available: provider.slotsAvailable,
      owner: {
        id: provider.owner.id,
        username: provider.owner.username,
        name: provider.owner.name
      },
      active_shops: provider.connections.length,
      connected_shops: provider.connections.map(conn => ({
        id: conn.shop.id,
        name: conn.shop.name,
        shop_type: conn.shop.shopType,
        connection_type: conn.connectionType,
        status: conn.status
      })),
      created_at: provider.createdAt,
      updated_at: provider.updatedAt
    }));

    return NextResponse.json({
      providers: transformedProviders
    });
  } catch (error) {
    console.error('Error fetching user providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
