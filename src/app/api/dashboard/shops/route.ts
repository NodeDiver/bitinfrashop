import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/dashboard/shops
 * Get all shops owned by the authenticated user with their connections and payment history
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      logger.warn('Dashboard shops: Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('Dashboard shops: Fetching shops for user', { userId });

    // Fetch all shops owned by the user
    const shops = await prisma.shop.findMany({
      where: {
        ownerId: parseInt(userId)
      },
      include: {
        connections: {
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                serviceType: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch payment history for all shops
    const shopsWithPayments = await Promise.all(
      shops.map(async (shop) => {
        const connectionIds = shop.connections.map(c => c.id);

        const paymentHistory = connectionIds.length > 0
          ? await prisma.paymentHistory.findMany({
              where: {
                connectionId: {
                  in: connectionIds
                }
              },
              orderBy: {
                paymentDate: 'desc'
              },
              take: 10
            })
          : [];

        return {
          id: shop.id,
          name: shop.name,
          description: shop.description,
          logo_url: shop.logoUrl,
          website: shop.website,
          contact_email: shop.contactEmail,
          lightning_address: shop.lightningAddress,
          is_public: shop.isPublic,
          btcpay_username: shop.btcpayUsername,
          onboarding_completed: shop.onboardingCompleted,
          created_at: shop.createdAt,
          connections: shop.connections.map(conn => ({
            id: conn.id,
            status: conn.status,
            connection_type: conn.connectionType,
            subscription_amount: conn.subscriptionAmount,
            setup_error: conn.setupError,
            retry_count: conn.retryCount,
            provider: {
              id: conn.provider.id,
              name: conn.provider.name,
              service_type: conn.provider.serviceType
            }
          })),
          payment_history: paymentHistory.map(payment => ({
            id: payment.id,
            payment_amount: payment.paymentAmount,
            payment_date: payment.paymentDate,
            status: payment.status
          }))
        };
      })
    );

    logger.info('Dashboard shops: Successfully fetched shops', {
      userId,
      shopCount: shopsWithPayments.length
    });

    return NextResponse.json({
      shops: shopsWithPayments
    });

  } catch (error) {
    logger.error('Dashboard shops: Error fetching shops', error);
    return NextResponse.json(
      { error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}
