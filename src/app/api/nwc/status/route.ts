import { NextRequest, NextResponse } from 'next/server';
import { nwcService } from '@/lib/nwc-service';
import { getUserById } from '@/lib/auth-prisma';

/**
 * GET /api/nwc/status
 * Check if the authenticated user has NWC configured
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await getUserById(parseInt(userId));
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's NWC connections
    const connections = await nwcService.getUserNWCConnections(user.id);

    // User has NWC if they have at least one active connection
    const hasNWC = connections.length > 0;

    return NextResponse.json({
      success: true,
      hasNWC,
      connectionCount: connections.length
    });

  } catch (error) {
    console.error('Error checking NWC status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
