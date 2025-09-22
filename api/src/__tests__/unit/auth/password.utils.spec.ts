/// <reference path="../../jest.d.ts" />

import { PasswordUtils } from '../../../auth/password.utils';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('PasswordUtils', () => {
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hash', () => {
    it('should hash password with correct salt rounds', async () => {
      // Arrange
      const password = 'testPassword123';
      const hashedPassword = '$2b$10$hashedpassword';
      mockBcrypt.hash.mockResolvedValue(hashedPassword);

      // Act
      const result = await PasswordUtils.hash(password);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('should handle different passwords', async () => {
      // Arrange
      const passwords = ['simple', 'Complex123!', ''];
      const hashedPasswords = ['hash1', 'hash2', 'hash3'];
      
      mockBcrypt.hash
        .mockResolvedValueOnce(hashedPasswords[0])
        .mockResolvedValueOnce(hashedPasswords[1])
        .mockResolvedValueOnce(hashedPasswords[2]);

      // Act
      const results = await Promise.all(passwords.map(pwd => PasswordUtils.hash(pwd)));

      // Assert
      expect(results).toEqual(hashedPasswords);
      expect(mockBcrypt.hash).toHaveBeenCalledTimes(3);
      expect(mockBcrypt.hash).toHaveBeenNthCalledWith(1, 'simple', 10);
      expect(mockBcrypt.hash).toHaveBeenNthCalledWith(2, 'Complex123!', 10);
      expect(mockBcrypt.hash).toHaveBeenNthCalledWith(3, '', 10);
    });

    it('should propagate bcrypt errors', async () => {
      // Arrange
      const error = new Error('Bcrypt hashing failed');
      mockBcrypt.hash.mockRejectedValue(error);

      // Act & Assert
      await expect(PasswordUtils.hash('password')).rejects.toThrow(error);
    });
  });

  describe('compare', () => {
    it('should return true when password matches hash', async () => {
      // Arrange
      const password = 'testPassword123';
      const hash = '$2b$10$hashedpassword';
      mockBcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await PasswordUtils.compare(password, hash);

      // Assert
      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it('should return false when password does not match hash', async () => {
      // Arrange
      const password = 'wrongPassword';
      const hash = '$2b$10$hashedpassword';
      mockBcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await PasswordUtils.compare(password, hash);

      // Assert
      expect(result).toBe(false);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it('should handle empty password', async () => {
      // Arrange
      const password = '';
      const hash = '$2b$10$hashedpassword';
      mockBcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await PasswordUtils.compare(password, hash);

      // Assert
      expect(result).toBe(false);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('', hash);
    });

    it('should handle empty hash', async () => {
      // Arrange
      const password = 'password';
      const hash = '';
      mockBcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await PasswordUtils.compare(password, hash);

      // Assert
      expect(result).toBe(false);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, '');
    });

    it('should propagate bcrypt comparison errors', async () => {
      // Arrange
      const error = new Error('Bcrypt comparison failed');
      mockBcrypt.compare.mockRejectedValue(error);

      // Act & Assert
      await expect(PasswordUtils.compare('password', 'hash')).rejects.toThrow(error);
    });

    it('should handle multiple comparisons', async () => {
      // Arrange
      const testCases = [
        { password: 'correct1', hash: 'hash1', expected: true },
        { password: 'wrong1', hash: 'hash1', expected: false },
        { password: 'correct2', hash: 'hash2', expected: true },
      ];

      testCases.forEach(({ expected }, index) => {
        if (index === 0) mockBcrypt.compare.mockResolvedValueOnce(expected);
        else mockBcrypt.compare.mockResolvedValueOnce(expected);
      });

      // Act
      const results = await Promise.all(
        testCases.map(({ password, hash }) => PasswordUtils.compare(password, hash))
      );

      // Assert
      expect(results).toEqual([true, false, true]);
      expect(mockBcrypt.compare).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateTempPassword', () => {
    it('should generate password with default length', () => {
      // Act
      const password = PasswordUtils.generateTempPassword();

      // Assert
      expect(password).toHaveLength(12);
      expect(typeof password).toBe('string');
    });

    it('should generate password with custom length', () => {
      // Act
      const shortPassword = PasswordUtils.generateTempPassword(6);
      const longPassword = PasswordUtils.generateTempPassword(20);

      // Assert
      expect(shortPassword).toHaveLength(6);
      expect(longPassword).toHaveLength(20);
    });

    it('should generate different passwords on subsequent calls', () => {
      // Act
      const password1 = PasswordUtils.generateTempPassword();
      const password2 = PasswordUtils.generateTempPassword();
      const password3 = PasswordUtils.generateTempPassword();

      // Assert
      expect(password1).not.toBe(password2);
      expect(password2).not.toBe(password3);
      expect(password1).not.toBe(password3);
    });

    it('should only contain valid characters', () => {
      // Arrange
      const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      
      // Act
      const password = PasswordUtils.generateTempPassword(100); // Large sample

      // Assert
      for (const char of password) {
        expect(validChars).toContain(char);
      }
    });

    it('should handle edge cases for length', () => {
      // Act
      const zeroLength = PasswordUtils.generateTempPassword(0);
      const oneChar = PasswordUtils.generateTempPassword(1);

      // Assert
      expect(zeroLength).toHaveLength(0);
      expect(oneChar).toHaveLength(1);
    });

    it('should contain mix of uppercase, lowercase, and numbers over multiple generations', () => {
      // Act - Generate many passwords to test character distribution
      const passwords = Array.from({ length: 50 }, () => PasswordUtils.generateTempPassword(20));
      const allChars = passwords.join('');

      // Assert
      expect(allChars).toMatch(/[A-Z]/); // Contains uppercase
      expect(allChars).toMatch(/[a-z]/); // Contains lowercase  
      expect(allChars).toMatch(/[0-9]/); // Contains numbers
    });

    it('should be performant for large lengths', () => {
      // Act
      const start = Date.now();
      const largePassword = PasswordUtils.generateTempPassword(1000);
      const duration = Date.now() - start;

      // Assert
      expect(largePassword).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('integration with real bcrypt', () => {
    // Note: These tests would use real bcrypt, but since we're mocking it,
    // we'll test the integration logic with mocked responses

    it('should work with typical authentication flow', async () => {
      // Arrange
      const plainPassword = 'userPassword123';
      const hashedPassword = '$2b$10$mocked.hash.value';
      
      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      mockBcrypt.compare.mockResolvedValue(true);

      // Act
      const hash = await PasswordUtils.hash(plainPassword);
      const isValid = await PasswordUtils.compare(plainPassword, hash);

      // Assert
      expect(hash).toBe(hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject wrong password in authentication flow', async () => {
      // Arrange
      const correctPassword = 'userPassword123';
      const wrongPassword = 'wrongPassword456';
      const hashedPassword = '$2b$10$mocked.hash.value';
      
      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      mockBcrypt.compare.mockResolvedValue(false);

      // Act
      const hash = await PasswordUtils.hash(correctPassword);
      const isValid = await PasswordUtils.compare(wrongPassword, hash);

      // Assert
      expect(hash).toBe(hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('static class behavior', () => {
    it('should work as static methods without instantiation', () => {
      // Assert - These should not throw errors
      expect(() => PasswordUtils.generateTempPassword()).not.toThrow();
      expect(typeof PasswordUtils.hash).toBe('function');
      expect(typeof PasswordUtils.compare).toBe('function');
      expect(typeof PasswordUtils.generateTempPassword).toBe('function');
    });

    it('should maintain consistent salt rounds', async () => {
      // Arrange
      mockBcrypt.hash.mockResolvedValue('hash1').mockResolvedValue('hash2');

      // Act
      await PasswordUtils.hash('password1');
      await PasswordUtils.hash('password2');

      // Assert
      expect(mockBcrypt.hash).toHaveBeenNthCalledWith(1, 'password1', 10);
      expect(mockBcrypt.hash).toHaveBeenNthCalledWith(2, 'password2', 10);
    });
  });
});
