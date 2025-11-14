import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/dashboard/providers
 * Get all providers owned by the authenticated user with analytics
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      logger.warn('Dashboard providers: Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('Dashboard providers: Fetching providers for user', { userId });

    // Fetch all providers owned by the user
    const providers = await prisma.infrastructureProvider.findMany({
      where: {
        ownerId: parseInt(userId)
      },
      include: {
        connections: {
          include: {
            shop: {
              select: {
                id: true,
                name: true
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

    // Calculate stats and build response
    const providersWithStats = await Promise.all(
      providers.map(async (provider) => {
        const connections = provider.connections;

        // Count by status
        const activeConnections = connections.filter(c => c.status === 'ACTIVE').length;
        const failedConnections = connections.filter(c => c.status === 'FAILED' || c.status === 'PENDING_SETUP').length;
        const pendingConnections = connections.filter(c => c.status === 'PENDING').length;

        // Calculate revenue
        const connectionIds = connections.map(c => c.id);

        const allPayments = connectionIds.length > 0
          ? await prisma.paymentHistory.findMany({
              where: {
                connectionId: {
                  in: connectionIds
                },
                status: 'success'
              }
            })
          : [];

        const totalRevenue = allPayments.reduce((sum, p) => sum + p.paymentAmount, 0);

        // Monthly revenue (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const monthlyPayments = allPayments.filter(p =>
          new Date(p.paymentDate) >= thirtyDaysAgo
        );

        const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.paymentAmount, 0);

        // Get connected shops with details
        const connectedShops = await Promise.all(
          connections.map(async (conn) => {
            // Get last payment for this connection
            const lastPayment = await prisma.paymentHistory.findFirst({
              where: {
                connectionId: conn.id,
                status: 'success'
              },
              orderBy: {
                paymentDate: 'desc'
              }
            });

            return {
              id: conn.shop.id,
              shop_name: conn.shop.name,
              status: conn.status,
              subscription_amount: conn.subscriptionAmount,
              connected_since: conn.createdAt,
              last_payment: lastPayment?.paymentDate || null
            };
          })
        );

        // Get recent events (from payment history)
        const recentEvents = connectionIds.length > 0
          ? await prisma.paymentHistory.findMany({
              where: {
                connectionId: {
                  in: connectionIds
                }
              },
              include: {
                connection: {
                  include: {
                    shop: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              },
              orderBy: {
                paymentDate: 'desc'
              },
              take: 10
            })
          : [];

        return {
          id: provider.id,
          name: provider.name,
          service_type: provider.serviceType,
          total_connections: connections.length,
          active_connections: activeConnections,
          failed_connections: failedConnections,
          pending_connections: pendingConnections,
          total_revenue: totalRevenue,
          monthly_revenue: monthlyRevenue,
          connected_shops: connectedShops,
          recent_events: recentEvents.map(event => ({
            id: event.id,
            event_type: event.status,
            shop_name: event.connection.shop.name,
            timestamp: event.paymentDate,
            details: event.errorMessage || `${event.paymentAmount} sats`
          }))
        };
      })
    );

    logger.info('Dashboard providers: Successfully fetched providers', {
      userId,
      providerCount: providersWithStats.length
    });

    return NextResponse.json({
      providers: providersWithStats
    });

  } catch (error) {
    logger.error('Dashboard providers: Error fetching providers', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
