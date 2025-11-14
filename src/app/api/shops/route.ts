import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { connectionPaymentService } from '@/lib/connection-payment-service';
import { logger } from '@/lib/logger';

// GET /api/shops - List all public shops (or user's own shops if authenticated)
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    const searchParams = request.nextUrl.searchParams;

    // Filter parameters
    const search = searchParams.get('search');
    const hasProvider = searchParams.get('hasProvider'); // 'true' or 'false'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};

    // If user is authenticated, show public shops + their own
    if (userId) {
      where.OR = [
        { isPublic: true },
        { ownerId: parseInt(userId) }
      ];
    } else {
      // Public only for non-authenticated users
      where.isPublic = true;
    }

    // Search by name, description, or address
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    // Filter by connection status
    if (hasProvider === 'true') {
      where.connections = {
        some: {
          status: 'ACTIVE'
        }
      };
    } else if (hasProvider === 'false') {
      where.connections = {
        none: {}
      };
    }

    const shops = await prisma.shop.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Count total for pagination
    const total = await prisma.shop.count({ where });

    // Transform data for response
    const transformedShops = shops.map(shop => ({
      id: shop.id,
      name: shop.name,
      description: shop.description,
      logo_url: shop.logoUrl,
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
      is_owner: userId ? shop.ownerId === parseInt(userId) : false,
      created_at: shop.createdAt,
      updated_at: shop.updatedAt
    }));

    return NextResponse.json({
      shops: transformedShops,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching shops:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}

// POST /api/shops - Create a new shop
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
    const {
      name,
      description,
      logoUrl,
      address,
      latitude,
      longitude,
      isPhysicalLocation,
      website,
      contactEmail,
      lightningAddress,
      acceptsBitcoin,
      isPublic,
      providerId, // Optional: connect to a provider immediately
      serviceRequirements, // Optional: service requirements for provider
      amount, // Optional: subscription amount in sats
      timeframe, // Optional: subscription interval (monthly, etc.)
      nwcConnectionString // Optional: NWC connection for paid subscriptions
    } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Shop name is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If providerId is provided, verify provider exists
    let provider = null;
    if (providerId) {
      provider = await prisma.infrastructureProvider.findUnique({
        where: { id: parseInt(providerId) }
      });

      if (!provider) {
        return NextResponse.json(
          { error: 'Provider not found' },
          { status: 404 }
        );
      }
    }

    // Create shop
    const shop = await prisma.shop.create({
      data: {
        name,
        description,
        logoUrl,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isPhysicalLocation: isPhysicalLocation || false,
        website,
        contactEmail,
        lightningAddress,
        acceptsBitcoin: acceptsBitcoin !== undefined ? acceptsBitcoin : true,
        isPublic: isPublic !== undefined ? isPublic : true,
        serviceRequirements,
        ownerId: parseInt(userId)
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });

    // If providerId is provided, create connection
    if (providerId && provider) {
      // Determine connection type based on whether amount is provided
      const connectionType = amount ? 'PAID_SUBSCRIPTION' : 'FREE_LISTING';

      // Validate NWC connection string for paid subscriptions
      if (amount && !nwcConnectionString) {
        return NextResponse.json(
          { error: 'NWC connection string required for paid subscriptions' },
          { status: 400 }
        );
      }

      const connection = await prisma.connection.create({
        data: {
          shopId: shop.id,
          providerId: parseInt(providerId),
          connectionType,
          status: 'PENDING',
          subscriptionAmount: amount ? parseInt(amount) : null,
          subscriptionInterval: timeframe || null
        }
      });

      // Initiate NWC payment for paid subscriptions
      if (amount && nwcConnectionString) {
        logger.info(`Initiating NWC payment for connection ${connection.id}`);

        try {
          const paymentResult = await connectionPaymentService.initiateConnectionPayment(
            connection.id,
            nwcConnectionString
          );

          if (!paymentResult.success) {
            logger.error(`Payment initiation failed for connection ${connection.id}:`, paymentResult.error);
            // Connection status is already updated to FAILED by the payment service
          }
        } catch (paymentError) {
          logger.error('Error during payment initiation:', paymentError);
          // Mark connection as failed
          await prisma.connection.update({
            where: { id: connection.id },
            data: {
              status: 'FAILED',
              setupError: `Payment initiation error: ${paymentError instanceof Error ? paymentError.message : 'Unknown error'}`
            }
          });
        }
      } else if (!amount) {
        // Free listing - mark as ACTIVE immediately
        await prisma.connection.update({
          where: { id: connection.id },
          data: {
            status: 'ACTIVE'
          }
        });
      }

      // If it's a BTCPay provider, call Greenfield API to create store
      if (provider.serviceType === 'BTCPAY_SERVER' && provider.hostUrl) {
        try {
          // Call Greenfield API endpoint
          const greenfieldResponse = await fetch(`${request.nextUrl.origin}/api/providers/greenfield/create-store`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || ''
            },
            body: JSON.stringify({
              shopId: shop.id,
              providerId: parseInt(providerId),
              shopName: name,
              shopEmail: contactEmail || lightningAddress
            })
          });

          if (greenfieldResponse.ok) {
            const greenfieldData = await greenfieldResponse.json();

            // Update shop with BTCPay credentials
            await prisma.shop.update({
              where: { id: shop.id },
              data: {
                btcpayStoreId: greenfieldData.storeId,
                btcpayUserId: greenfieldData.userId,
                btcpayUsername: greenfieldData.username
              }
            });

            // Return shop with temp password for onboarding
            return NextResponse.json({
              shop: {
                id: shop.id,
                name: shop.name,
                description: shop.description,
                logo_url: shop.logoUrl,
                address: shop.address,
                latitude: shop.latitude,
                longitude: shop.longitude,
                is_physical_location: shop.isPhysicalLocation,
                website: shop.website,
                contact_email: shop.contactEmail,
                lightning_address: shop.lightningAddress,
                accepts_bitcoin: shop.acceptsBitcoin,
                is_public: shop.isPublic,
                owner: shop.owner,
                btcpay_username: greenfieldData.username,
                btcpay_temp_password: greenfieldData.tempPassword,
                created_at: shop.createdAt,
                updated_at: shop.updatedAt
              }
            }, { status: 201 });
          }
        } catch (greenfieldError) {
          console.error('Greenfield API error:', greenfieldError);
          // Continue anyway - shop is created, just mark connection as PENDING
        }
      }
    }

    return NextResponse.json({
      shop: {
        id: shop.id,
        name: shop.name,
        description: shop.description,
        logo_url: shop.logoUrl,
        address: shop.address,
        latitude: shop.latitude,
        longitude: shop.longitude,
        is_physical_location: shop.isPhysicalLocation,
        website: shop.website,
        contact_email: shop.contactEmail,
        lightning_address: shop.lightningAddress,
        accepts_bitcoin: shop.acceptsBitcoin,
        is_public: shop.isPublic,
        owner: shop.owner,
        created_at: shop.createdAt,
        updated_at: shop.updatedAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating shop:', error);
    return NextResponse.json(
      { error: 'Failed to create shop' },
      { status: 500 }
    );
  }
}
