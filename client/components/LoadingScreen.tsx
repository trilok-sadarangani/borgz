import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type Props = {
  /** Background color for the full-screen loading view. */
  backgroundColor?: string;
};

function CardBack({ style }: { style?: unknown }) {
  return (
    <View style={[styles.card, style as any]}>
      <View style={styles.cardInner}>
        <View style={styles.cardPipRow}>
          <View style={styles.cardPip} />
          <View style={styles.cardPip} />
          <View style={styles.cardPip} />
        </View>
        <View style={[styles.cardPipRow, { opacity: 0.75 }]}>
          <View style={styles.cardPip} />
          <View style={styles.cardPip} />
          <View style={styles.cardPip} />
        </View>
        <View style={[styles.cardPipRow, { opacity: 0.5 }]}>
          <View style={styles.cardPip} />
          <View style={styles.cardPip} />
          <View style={styles.cardPip} />
        </View>
      </View>
    </View>
  );
}

export function LoadingScreen({ backgroundColor = '#0B0F14' }: Props) {
  const v0 = useRef(new Animated.Value(0)).current;
  const v1 = useRef(new Animated.Value(0)).current;
  const v2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mkLoop = (v: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.delay(240),
          Animated.timing(v, { toValue: 0, duration: 520, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.delay(240),
        ])
      );

    const a0 = mkLoop(v0, 0);
    const a1 = mkLoop(v1, 140);
    const a2 = mkLoop(v2, 280);

    a0.start();
    a1.start();
    a2.start();

    return () => {
      a0.stop();
      a1.stop();
      a2.stop();
    };
  }, [v0, v1, v2]);

  const cards = useMemo(() => {
    const makeStyle = (v: Animated.Value, x: number, y: number, r: string) => ({
      transform: [
        { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
        { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', r] }) },
        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
      ],
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }),
    });

    return [
      { key: 'c0', v: v0, base: styles.cardBase0, anim: makeStyle(v0, -58, -8, '-10deg') },
      { key: 'c1', v: v1, base: styles.cardBase1, anim: makeStyle(v1, 0, -18, '0deg') },
      { key: 'c2', v: v2, base: styles.cardBase2, anim: makeStyle(v2, 58, -8, '10deg') },
    ];
  }, [v0, v1, v2]);

  return (
    <View style={[styles.screen, { backgroundColor }]}>
      <View style={styles.center}>
        <View style={styles.stackFrame}>
          {cards.map((c) => (
            <Animated.View key={c.key} style={[styles.cardWrap, c.base, c.anim]}>
              <CardBack />
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );
}

const CARD_W = 92;
const CARD_H = 128;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackFrame: {
    width: 220,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    position: 'absolute',
  },
  cardBase0: {
    transform: [{ rotate: '-6deg' }],
  },
  cardBase1: {
    transform: [{ rotate: '0deg' }],
  },
  cardBase2: {
    transform: [{ rotate: '6deg' }],
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
  },
  cardInner: {
    flex: 1,
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardPipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cardPip: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
});


