import crypto from 'crypto';
import { logger } from './logger';

/**
 * Generic Encryption Service for sensitive data (API keys, secrets, etc.)
 *
 * Security Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Random IV for each encryption
 * - HMAC-based authentication
 * - Environment-based encryption keys
 */

interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  salt: string;
}

class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits
  private readonly tagLength = 16; // 128 bits

  /**
   * Derive encryption key from environment variable and salt
   */
  private deriveKey(salt: Buffer): Buffer {
    const masterKey = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;

    if (!masterKey) {
      throw new Error('ENCRYPTION_KEY or SESSION_SECRET environment variable is required');
    }

    if (masterKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }

    return crypto.pbkdf2Sync(masterKey, salt, 100000, this.keyLength, 'sha512');
  }

  /**
   * Encrypt sensitive data (API keys, secrets, etc.)
   */
  public encrypt(plaintext: string): string {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Derive key from master key and salt
      const key = this.deriveKey(salt);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Create structured data
      const encryptedData: EncryptedData = {
        encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        salt: salt.toString('base64')
      };

      // Return as JSON string
      return JSON.stringify(encryptedData);
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  public decrypt(encryptedString: string): string {
    try {
      // Parse encrypted data
      const encryptedData: EncryptedData = JSON.parse(encryptedString);

      // Convert from base64
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');
      const salt = Buffer.from(encryptedData.salt, 'base64');

      // Derive key
      const key = this.deriveKey(salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt data
      let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Securely compare two strings (timing-safe)
   */
  public secureCompare(a: string, b: string): boolean {
    try {
      const bufferA = Buffer.from(a);
      const bufferB = Buffer.from(b);

      if (bufferA.length !== bufferB.length) {
        return false;
      }

      return crypto.timingSafeEqual(bufferA, bufferB);
    } catch {
      return false;
    }
  }

  /**
   * Generate a random secret (for webhook secrets, etc.)
   */
  public generateSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash data (for webhook signature verification)
   */
  public hmacSha256(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();

// Export types
export type { EncryptedData };
