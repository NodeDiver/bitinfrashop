import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/user/shops - Get only the authenticated user's shops
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const shops = await prisma.shop.findMany({
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
            provider: {
              select: {
                id: true,
                name: true,
                serviceType: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform data for response
    const transformedShops = shops.map(shop => ({
      id: shop.id,
      name: shop.name,
      description: shop.description,
      logo_url: shop.logoUrl,
      shop_type: shop.shopType,
      address: shop.address,
      latitude: shop.latitude,
      longitude: shop.longitude,
      is_physical_location: shop.isPhysicalLocation,
      website: shop.website,
      contact_email: shop.contactEmail,
      lightning_address: shop.lightningAddress,
      accepts_bitcoin: shop.acceptsBitcoin,
      is_public: shop.isPublic,
      owner: {
        id: shop.owner.id,
        username: shop.owner.username,
        name: shop.owner.name
      },
      providers: shop.connections.map(conn => ({
        id: conn.provider.id,
        name: conn.provider.name,
        service_type: conn.provider.serviceType,
        connection_type: conn.connectionType,
        status: conn.status
      })),
      created_at: shop.createdAt,
      updated_at: shop.updatedAt
    }));

    return NextResponse.json({
      shops: transformedShops
    });
  } catch (error) {
    console.error('Error fetching user shops:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}
