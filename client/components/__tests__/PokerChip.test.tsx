import { getChipColor, getChipStack } from '../PokerChip';

describe('PokerChip Utils', () => {
  describe('getChipColor', () => {
    test('should return correct colors for standard denominations', () => {
      expect(getChipColor(1)).toBe('#ffffff'); // White
      expect(getChipColor(5)).toBe('#ef4444'); // Red
      expect(getChipColor(10)).toBe('#3b82f6'); // Blue
      expect(getChipColor(25)).toBe('#22c55e'); // Green
      expect(getChipColor(100)).toBe('#000000'); // Black
      expect(getChipColor(500)).toBe('#9370DB'); // Purple
      expect(getChipColor(1000)).toBe('#FFD700'); // Gold
      expect(getChipColor(5000)).toBe('#8B4513'); // Brown
      expect(getChipColor(10000)).toBe('#000000'); // Black
    });

    test('should use highest denomination color for amounts between denominations', () => {
      expect(getChipColor(7)).toBe('#ef4444'); // Closer to $5 red
      expect(getChipColor(15)).toBe('#3b82f6'); // Closer to $10 blue
      expect(getChipColor(150)).toBe('#000000'); // Closer to $100 black
    });
  });

  describe('getChipStack', () => {
    test('should calculate optimal chip breakdown for simple amounts', () => {
      const stack = getChipStack(100);
      expect(stack).toEqual([
        { color: '#000000', count: 1, value: 100 },
      ]);
    });

    test('should break down mixed denominations correctly', () => {
      const stack = getChipStack(137);
      
      // Should be: 1x $100 + 1x $25 + 1x $10 + 2x $1
      expect(stack.length).toBeGreaterThan(0);
      expect(stack[0]).toEqual({ color: '#000000', count: 1, value: 100 });
      expect(stack[1]).toEqual({ color: '#22c55e', count: 1, value: 25 });
      expect(stack[2]).toEqual({ color: '#3b82f6', count: 1, value: 10 });
    });

    test('should limit chip count to 10 per stack for visual clarity', () => {
      const stack = getChipStack(150); // 150x $1 chips, but should show max 10
      
      const whiteChips = stack.find(s => s.value === 1);
      if (whiteChips) {
        expect(whiteChips.count).toBeLessThanOrEqual(10);
      }
    });

    test('should handle large amounts with high denominations', () => {
      const stack = getChipStack(15000);
      
      // Should use $10k and $5k chips
      expect(stack[0].value).toBe(10000);
      expect(stack[0].count).toBe(1);
      expect(stack[1].value).toBe(5000);
      expect(stack[1].count).toBe(1);
    });

    test('should handle zero amount', () => {
      const stack = getChipStack(0);
      expect(stack).toEqual([]);
    });

    test('should optimize for common poker amounts', () => {
      // Big blind call of 20
      const stack20 = getChipStack(20);
      expect(stack20.some(s => s.value === 10)).toBe(true);
      
      // Typical raise to 50
      const stack50 = getChipStack(50);
      expect(stack50.some(s => s.value === 25)).toBe(true);
      
      // All-in for 1000
      const stack1000 = getChipStack(1000);
      expect(stack1000).toEqual([
        { color: '#FFD700', count: 1, value: 1000 },
      ]);
    });
  });
});
