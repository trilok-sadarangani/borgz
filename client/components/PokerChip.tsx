import { View, Text, StyleSheet } from 'react-native';

type ChipType = 'dealer' | 'small-blind' | 'big-blind' | 'bet';

interface PokerChipProps {
  type: ChipType;
  amount?: number;
  style?: any;
}

// Get chip color based on denomination (standard poker chip colors)
export function getChipColor(amount: number): string {
  if (amount >= 10000) return '#000000'; // Black - 10k+
  if (amount >= 5000) return '#8B4513'; // Brown - 5k
  if (amount >= 1000) return '#FFD700'; // Yellow/Gold - 1k
  if (amount >= 500) return '#9370DB'; // Purple - 500
  if (amount >= 100) return '#000000'; // Black - 100
  if (amount >= 25) return '#22c55e'; // Green - 25
  if (amount >= 10) return '#3b82f6'; // Blue - 10
  if (amount >= 5) return '#ef4444'; // Red - 5
  return '#ffffff'; // White - 1
}

// Calculate how many chips of each color to show
export function getChipStack(amount: number): Array<{ color: string; count: number; value: number }> {
  const denominations = [
    { value: 10000, color: '#000000' },
    { value: 5000, color: '#8B4513' },
    { value: 1000, color: '#FFD700' },
    { value: 500, color: '#9370DB' },
    { value: 100, color: '#000000' },
    { value: 25, color: '#22c55e' },
    { value: 10, color: '#3b82f6' },
    { value: 5, color: '#ef4444' },
    { value: 1, color: '#ffffff' },
  ];

  const stacks: Array<{ color: string; count: number; value: number }> = [];
  let remaining = amount;

  for (const denom of denominations) {
    if (remaining >= denom.value) {
      const count = Math.floor(remaining / denom.value);
      if (count > 0) {
        // Limit to 10 chips per stack for visual clarity
        stacks.push({ color: denom.color, count: Math.min(count, 10), value: denom.value });
        remaining -= count * denom.value;
      }
    }
  }

  return stacks;
}

export function PokerChip({ type, amount, style }: PokerChipProps) {
  if (type === 'dealer') {
    return (
      <View style={[styles.dealerChip, style]}>
        <Text style={styles.dealerText}>D</Text>
      </View>
    );
  }

  if (type === 'small-blind') {
    return (
      <View style={[styles.blindChip, styles.smallBlindChip, style]}>
        <Text style={styles.blindText}>SB</Text>
      </View>
    );
  }

  if (type === 'big-blind') {
    return (
      <View style={[styles.blindChip, styles.bigBlindChip, style]}>
        <Text style={styles.blindText}>BB</Text>
      </View>
    );
  }

  // Bet chips - show stack
  if (type === 'bet' && amount) {
    const stacks = getChipStack(amount);
    
    return (
      <View style={[styles.betChipContainer, style]}>
        <View style={styles.chipStacks}>
          {stacks.map((stack, idx) => (
            <View key={idx} style={styles.chipStackColumn}>
              {Array.from({ length: Math.min(stack.count, 5) }).map((_, chipIdx) => (
                <View
                  key={chipIdx}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: stack.color,
                      marginTop: chipIdx * -8,
                      zIndex: chipIdx,
                    },
                  ]}
                >
                  {chipIdx === 0 && stack.count > 1 && (
                    <Text style={[styles.chipValue, stack.color === '#ffffff' ? { color: '#000' } : {}]}>
                      {stack.count}x
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
        <Text style={styles.betAmount}>{amount}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  dealerChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dealerText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  blindChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  smallBlindChip: {
    backgroundColor: '#3b82f6',
    borderColor: '#1e40af',
  },
  bigBlindChip: {
    backgroundColor: '#ef4444',
    borderColor: '#991b1b',
  },
  blindText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
  },
  betChipContainer: {
    alignItems: 'center',
  },
  chipStacks: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  chipStackColumn: {
    alignItems: 'center',
  },
  chip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
  chipValue: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ffffff',
  },
  betAmount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
