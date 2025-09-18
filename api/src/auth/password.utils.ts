import * as bcrypt from 'bcrypt';

export class PasswordUtils {
  private static readonly SALT_ROUNDS = 10;

  /**
   * Hash a plain text password
   * @param password - Plain text password
   * @returns Hashed password
   */
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare plain text password with hash
   * @param password - Plain text password
   * @param hash - Stored password hash
   * @returns True if password matches
   */
  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a temporary password (for testing/seeding)
   * @param length - Password length (default: 12)
   * @returns Random password string
   */
  static generateTempPassword(length: number = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
