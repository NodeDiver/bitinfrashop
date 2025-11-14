/**
 * Input Validation
 *
 * Centralized input validation to prevent XSS, SQL injection, and other attacks.
 * Uses schema validation for type safety and security.
 */

import { logger } from './logger';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lightning address regex (user@domain.com format)
const LIGHTNING_ADDRESS_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// URL validation regex
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

// Bitcoin address regex (basic validation)
const BITCOIN_ADDRESS_REGEX = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;

// NWC connection string regex
const NWC_CONNECTION_REGEX = /^nostr\+walletconnect:\/\/[a-zA-Z0-9+/=]+(\?|#)[a-zA-Z0-9+/=&-]+$/;

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class InputValidator {
  /**
   * Sanitize string input to prevent XSS
   */
  sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 10000); // Limit length
  }

  /**
   * Validate and sanitize email address
   */
  validateEmail(email: string, required: boolean = true): string | null {
    if (!email || email.trim() === '') {
      if (required) {
        throw new ValidationError('Email is required', 'email');
      }
      return null;
    }

    const sanitized = this.sanitizeString(email).toLowerCase();

    if (!EMAIL_REGEX.test(sanitized)) {
      throw new ValidationError('Invalid email format', 'email');
    }

    if (sanitized.length > 254) {
      throw new ValidationError('Email is too long', 'email');
    }

    return sanitized;
  }

  /**
   * Validate lightning address
   */
  validateLightningAddress(address: string, required: boolean = false): string | null {
    if (!address || address.trim() === '') {
      if (required) {
        throw new ValidationError('Lightning address is required', 'lightningAddress');
      }
      return null;
    }

    const sanitized = this.sanitizeString(address).toLowerCase();

    if (!LIGHTNING_ADDRESS_REGEX.test(sanitized)) {
      throw new ValidationError('Invalid lightning address format', 'lightningAddress');
    }

    return sanitized;
  }

  /**
   * Validate URL
   */
  validateUrl(url: string, required: boolean = false): string | null {
    if (!url || url.trim() === '') {
      if (required) {
        throw new ValidationError('URL is required', 'url');
      }
      return null;
    }

    const sanitized = this.sanitizeString(url);

    if (!URL_REGEX.test(sanitized)) {
      throw new ValidationError('Invalid URL format', 'url');
    }

    // Ensure HTTPS in production
    if (process.env.NODE_ENV === 'production' && !sanitized.startsWith('https://')) {
      throw new ValidationError('URLs must use HTTPS in production', 'url');
    }

    return sanitized;
  }

  /**
   * Validate Bitcoin address
   */
  validateBitcoinAddress(address: string, required: boolean = false): string | null {
    if (!address || address.trim() === '') {
      if (required) {
        throw new ValidationError('Bitcoin address is required', 'bitcoinAddress');
      }
      return null;
    }

    const sanitized = this.sanitizeString(address);

    if (!BITCOIN_ADDRESS_REGEX.test(sanitized)) {
      throw new ValidationError('Invalid Bitcoin address format', 'bitcoinAddress');
    }

    return sanitized;
  }

  /**
   * Validate NWC connection string
   */
  validateNWCConnection(connectionString: string, required: boolean = false): string | null {
    if (!connectionString || connectionString.trim() === '') {
      if (required) {
        throw new ValidationError('NWC connection string is required', 'nwcConnectionString');
      }
      return null;
    }

    const sanitized = connectionString.trim();

    if (!NWC_CONNECTION_REGEX.test(sanitized)) {
      throw new ValidationError('Invalid NWC connection string format', 'nwcConnectionString');
    }

    return sanitized;
  }

  /**
   * Validate integer
   */
  validateInteger(value: any, field: string, min?: number, max?: number): number {
    const num = parseInt(value);

    if (isNaN(num)) {
      throw new ValidationError(`${field} must be a valid number`, field);
    }

    if (min !== undefined && num < min) {
      throw new ValidationError(`${field} must be at least ${min}`, field);
    }

    if (max !== undefined && num > max) {
      throw new ValidationError(`${field} must be at most ${max}`, field);
    }

    return num;
  }

  /**
   * Validate float
   */
  validateFloat(value: any, field: string, min?: number, max?: number): number {
    const num = parseFloat(value);

    if (isNaN(num)) {
      throw new ValidationError(`${field} must be a valid number`, field);
    }

    if (min !== undefined && num < min) {
      throw new ValidationError(`${field} must be at least ${min}`, field);
    }

    if (max !== undefined && num > max) {
      throw new ValidationError(`${field} must be at most ${max}`, field);
    }

    return num;
  }

  /**
   * Validate string length
   */
  validateStringLength(
    value: string,
    field: string,
    minLength?: number,
    maxLength?: number
  ): string {
    const sanitized = this.sanitizeString(value);

    if (minLength !== undefined && sanitized.length < minLength) {
      throw new ValidationError(
        `${field} must be at least ${minLength} characters`,
        field
      );
    }

    if (maxLength !== undefined && sanitized.length > maxLength) {
      throw new ValidationError(
        `${field} must be at most ${maxLength} characters`,
        field
      );
    }

    return sanitized;
  }

  /**
   * Validate enum value
   */
  validateEnum<T extends string>(
    value: string,
    field: string,
    allowedValues: readonly T[]
  ): T {
    if (!allowedValues.includes(value as T)) {
      throw new ValidationError(
        `${field} must be one of: ${allowedValues.join(', ')}`,
        field
      );
    }

    return value as T;
  }

  /**
   * Validate boolean
   */
  validateBoolean(value: any, field: string): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 'true') return true;
    if (value === 'false') return false;

    throw new ValidationError(`${field} must be a boolean value`, field);
  }

  /**
   * Validate and sanitize shop name
   */
  validateShopName(name: string): string {
    return this.validateStringLength(name, 'Shop name', 1, 100);
  }

  /**
   * Validate and sanitize description
   */
  validateDescription(description: string, required: boolean = false): string | null {
    if (!description || description.trim() === '') {
      if (required) {
        throw new ValidationError('Description is required', 'description');
      }
      return null;
    }

    return this.validateStringLength(description, 'Description', undefined, 5000);
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(lat: any, lng: any): { latitude: number; longitude: number } | null {
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      return null;
    }

    const latitude = this.validateFloat(lat, 'Latitude', -90, 90);
    const longitude = this.validateFloat(lng, 'Longitude', -180, 180);

    return { latitude, longitude };
  }

  /**
   * Detect SQL injection patterns
   */
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|;|\/\*|\*\/|xp_|sp_)/i,
      /('OR'|'AND'|'1'='1')/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate and sanitize with SQL injection detection
   */
  validateAndSanitize(input: string, field: string): string {
    const sanitized = this.sanitizeString(input);

    if (this.detectSQLInjection(sanitized)) {
      logger.warn('Potential SQL injection detected', { field, input: sanitized.substring(0, 100) });
      throw new ValidationError('Invalid input detected', field);
    }

    return sanitized;
  }
}

// Export singleton instance
export const inputValidator = new InputValidator();

// Export class for testing
export { InputValidator };
