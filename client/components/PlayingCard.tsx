import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

export type CardSuit = 'spades' | 'hearts' | 'clubs' | 'diamonds';

function suitSymbol(suit: CardSuit): string {
  switch (suit) {
    case 'spades':
      return '♠';
    case 'hearts':
      return '♥';
    case 'clubs':
      return '♣';
    case 'diamonds':
      return '♦';
  }
}

function suitColor(suit: CardSuit): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#b00020' : '#111';
}

export function PlayingCard(props: {
  suit: CardSuit;
  value: string;
  style?: StyleProp<ViewStyle>;
}) {
  const color = suitColor(props.suit);
  const symbol = suitSymbol(props.suit);

  return (
    <View style={[styles.card, props.style]}>
      <View style={styles.corner}>
        <Text style={[styles.value, { color }]}>{props.value}</Text>
        <Text style={[styles.suit, { color }]}>{symbol}</Text>
      </View>

      <Text style={[styles.centerSuit, { color }]}>{symbol}</Text>

      <View style={[styles.corner, styles.cornerBR]}>
        <Text style={[styles.value, { color }]}>{props.value}</Text>
        <Text style={[styles.suit, { color }]}>{symbol}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 92,
    height: 128,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
  },
  corner: {
    position: 'absolute',
    top: 10,
    left: 10,
    alignItems: 'center',
  },
  cornerBR: {
    top: undefined,
    left: undefined,
    right: 10,
    bottom: 10,
    transform: [{ rotate: '180deg' }],
  },
  value: { fontSize: 16, fontWeight: '900', lineHeight: 18 },
  suit: { fontSize: 14, fontWeight: '900', lineHeight: 16 },
  centerSuit: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 44,
    fontWeight: '800',
    opacity: 0.22,
  },
});


