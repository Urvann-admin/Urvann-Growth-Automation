import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkuCounterModel } from '@/models/skuCounter';

vi.mock('@/models/skuCounter');

const mockGetNextCounter = vi.mocked(SkuCounterModel.getNextCounter);

describe('SKU Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getHubCode', () => {
    it('should extract first letter of hub name', async () => {
      mockGetNextCounter.mockResolvedValue(1);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku = await generateSKU('Whitefield', 'Money Plant', 1);
      expect(sku.charAt(0)).toBe('W');
    });

    it('should handle multi-word hubs', async () => {
      mockGetNextCounter.mockResolvedValue(1);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku = await generateSKU('HSR', 'Money Plant', 1);
      expect(sku.charAt(0)).toBe('H');
    });

    it('should throw error for invalid hub', async () => {
      const { generateSKU } = await import('../skuGenerator');
      
      await expect(generateSKU('InvalidHub', 'Money Plant', 1))
        .rejects.toThrow('Invalid hub');
    });
  });

  describe('getProductCode', () => {
    it('should extract first letters of two words', async () => {
      mockGetNextCounter.mockResolvedValue(1);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku = await generateSKU('Whitefield', 'Money Plant', 1);
      expect(sku.substring(1, 3)).toBe('MP');
    });

    it('should handle single word products', async () => {
      mockGetNextCounter.mockResolvedValue(1);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku = await generateSKU('Whitefield', 'Monstera', 1);
      expect(sku.substring(1, 3)).toBe('MO');
    });

    it('should handle three word products', async () => {
      mockGetNextCounter.mockResolvedValue(1);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku = await generateSKU('Whitefield', 'Snake Plant Green', 1);
      expect(sku.substring(1, 3)).toBe('SP');
    });
  });

  describe('getPaddedSequence', () => {
    it('should pad sequence to 4 digits', async () => {
      mockGetNextCounter.mockResolvedValue(1);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku = await generateSKU('Whitefield', 'Money Plant', 1);
      expect(sku.substring(3, 7)).toBe('0001');
    });

    it('should handle larger counters', async () => {
      mockGetNextCounter.mockResolvedValue(123);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku = await generateSKU('Whitefield', 'Money Plant', 1);
      expect(sku.substring(3, 7)).toBe('0123');
    });

    it('should handle max counter', async () => {
      mockGetNextCounter.mockResolvedValue(9999);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku = await generateSKU('Whitefield', 'Money Plant', 1);
      expect(sku.substring(3, 7)).toBe('9999');
    });
  });

  describe('getQtyCode', () => {
    it('should pad quantity to 2 digits', async () => {
      mockGetNextCounter.mockResolvedValue(1);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku = await generateSKU('Whitefield', 'Money Plant', 1);
      expect(sku.substring(7, 9)).toBe('01');
    });

    it('should handle double digit quantities', async () => {
      mockGetNextCounter.mockResolvedValue(1);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku = await generateSKU('Whitefield', 'Money Plant', 10);
      expect(sku.substring(7, 9)).toBe('10');
    });

    it('should throw error for quantity > 99', async () => {
      const { generateSKU } = await import('../skuGenerator');
      
      await expect(generateSKU('Whitefield', 'Money Plant', 100))
        .rejects.toThrow('Quantity must be an integer between 1 and 99');
    });

    it('should throw error for quantity < 1', async () => {
      const { generateSKU } = await import('../skuGenerator');
      
      await expect(generateSKU('Whitefield', 'Money Plant', 0))
        .rejects.toThrow('Quantity must be an integer between 1 and 99');
    });
  });

  describe('Full SKU generation', () => {
    it('should generate correct SKU format', async () => {
      mockGetNextCounter.mockResolvedValue(1);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku = await generateSKU('Whitefield', 'Money Plant', 1);
      expect(sku).toMatch(/^WMP0001\d{2}\d$/);
      expect(sku.length).toBe(10);
    });

    it('should generate different SKUs for different hubs', async () => {
      mockGetNextCounter.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku1 = await generateSKU('Whitefield', 'Money Plant', 1);
      const sku2 = await generateSKU('Noida', 'Money Plant', 1);
      
      expect(sku1.charAt(0)).toBe('W');
      expect(sku2.charAt(0)).toBe('N');
    });

    it('should generate different SKUs for different products', async () => {
      mockGetNextCounter.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
      const { generateSKU } = await import('../skuGenerator');
      
      const sku1 = await generateSKU('Whitefield', 'Money Plant', 1);
      const sku2 = await generateSKU('Whitefield', 'Snake Plant', 1);
      
      expect(sku1.substring(1, 3)).toBe('MP');
      expect(sku2.substring(1, 3)).toBe('SP');
    });
  });

  describe('generateParentSKU', () => {
    it('should always use quantity 01 for parents', async () => {
      mockGetNextCounter.mockResolvedValue(1);
      const { generateParentSKU } = await import('../skuGenerator');
      
      const sku = await generateParentSKU('Whitefield', 'Money Plant');
      expect(sku.substring(7, 9)).toBe('01');
    });
  });

  describe('validateHub', () => {
    it('should validate correct hubs', async () => {
      const { validateHub } = await import('../skuGenerator');
      
      expect(validateHub('Whitefield')).toBe(true);
      expect(validateHub('Noida')).toBe(true);
      expect(validateHub('HSR')).toBe(true);
    });

    it('should reject invalid hubs', async () => {
      const { validateHub } = await import('../skuGenerator');
      
      expect(validateHub('InvalidHub')).toBe(false);
      expect(validateHub('')).toBe(false);
    });

    it('should be case insensitive', async () => {
      const { validateHub } = await import('../skuGenerator');
      
      expect(validateHub('whitefield')).toBe(true);
      expect(validateHub('NOIDA')).toBe(true);
    });
  });
});
