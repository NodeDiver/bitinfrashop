import { logger } from './logger';
import { auditLogger } from './audit-logger';

/**
 * Rate Limiter
 *
 * Simple in-memory rate limiter to protect API endpoints from abuse.
 * For production with multiple servers, use Redis-based rate limiting.
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Default rate limit configs for different endpoint types
export const RATE_LIMITS = {
  // General API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  },
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  },
  // Webhook endpoints
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  },
  // Payment endpoints
  payment: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10
  },
  // Admin endpoints
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50
  },
  // Greenfield API endpoints
  greenfield: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10
  }
} as const;

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request should be rate limited
   * @returns true if request should be allowed, false if rate limited
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig = RATE_LIMITS.api
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const key = this.generateKey(identifier, config);

    // Get or create rate limit entry
    let entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    if (!allowed) {
      logger.warn('Rate limit exceeded', {
        identifier,
        count: entry.count,
        limit: config.maxRequests
      });

      // Log security event
      await auditLogger.logSecurity('security.rate_limit_exceeded', identifier, {
        count: entry.count,
        limit: config.maxRequests,
        resetTime: new Date(entry.resetTime).toISOString()
      });
    }

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime
    };
  }

  /**
   * Generate unique key for rate limit entry
   */
  private generateKey(identifier: string, config: RateLimitConfig): string {
    return `${identifier}:${config.windowMs}:${config.maxRequests}`;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup', { entriesRemoved: cleaned });
    }
  }

  /**
   * Clear all rate limit entries (useful for testing)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Stop the cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export class for testing
export { RateLimiter };

/**
 * Rate limiting middleware helper
 */
export async function applyRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.api
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
}> {
  const result = await rateLimiter.checkLimit(identifier, config);

  const headers = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
  };

  if (!result.allowed) {
    headers['Retry-After'] = Math.ceil((result.resetTime - Date.now()) / 1000).toString();
  }

  return {
    allowed: result.allowed,
    headers
  };
}
