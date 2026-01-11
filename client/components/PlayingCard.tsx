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
  return suit === 'hearts' || suit === 'diamonds' ? '#dc2626' : '#1f2937';
}

export function PlayingCard(props: {
  suit: CardSuit;
  value: string;
  style?: StyleProp<ViewStyle>;
  size?: 'small' | 'medium' | 'large';
}) {
  const color = suitColor(props.suit);
  const symbol = suitSymbol(props.suit);
  const size = props.size || 'medium';

  // Dynamic sizing based on prop
  const dimensions = {
    small: { width: 40, height: 56, borderRadius: 6 },
    medium: { width: 60, height: 84, borderRadius: 8 },
    large: { width: 80, height: 112, borderRadius: 10 },
  }[size];

  const fontSize = {
    small: { value: 11, suit: 10, center: 22, cornerTop: 4, cornerLeft: 4 },
    medium: { value: 14, suit: 12, center: 32, cornerTop: 6, cornerLeft: 6 },
    large: { value: 16, suit: 14, center: 44, cornerTop: 8, cornerLeft: 8 },
  }[size];

  return (
    <View
      style={[
        styles.card,
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: dimensions.borderRadius,
        },
        props.style,
      ]}
    >
      <View style={[styles.corner, { top: fontSize.cornerTop, left: fontSize.cornerLeft }]}>
        <Text style={[styles.value, { color, fontSize: fontSize.value }]}>{props.value}</Text>
        <Text style={[styles.suit, { color, fontSize: fontSize.suit }]}>{symbol}</Text>
      </View>

      <Text style={[styles.centerSuit, { color, fontSize: fontSize.center }]}>{symbol}</Text>

      <View
        style={[
          styles.corner,
          styles.cornerBR,
          { bottom: fontSize.cornerTop, right: fontSize.cornerLeft },
        ]}
      >
        <Text style={[styles.value, { color, fontSize: fontSize.value }]}>{props.value}</Text>
        <Text style={[styles.suit, { color, fontSize: fontSize.suit }]}>{symbol}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  corner: {
    position: 'absolute',
    alignItems: 'center',
  },
  cornerBR: {
    top: undefined,
    left: undefined,
    transform: [{ rotate: '180deg' }],
  },
  value: { fontWeight: '900', lineHeight: undefined },
  suit: { fontWeight: '900', lineHeight: undefined, marginTop: -2 },
  centerSuit: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '800',
    opacity: 0.15,
  },
});

