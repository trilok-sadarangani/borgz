import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { PlayingCard } from './PlayingCard';

type Props = {
  /** Background color for the full-screen loading view. */
  backgroundColor?: string;
  /**
   * If provided, we'll animate a determinate progress bar from 0 → 100 and call this
   * after reaching 100 (mimics the web snippet behavior).
   */
  onComplete?: () => void;
  /** Optional label under the progress bar. */
  label?: string;
};

export function LoadingScreen({ backgroundColor = '#fff', onComplete, label }: Props) {
  const [progress, setProgress] = useState(0);

  const v0 = useRef(new Animated.Value(0)).current;
  const v1 = useRef(new Animated.Value(0)).current;
  const v2 = useRef(new Animated.Value(0)).current;
  const v3 = useRef(new Animated.Value(0)).current;

  const indeterminate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mkLoop = (v: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.delay(220),
          Animated.timing(v, { toValue: 0, duration: 520, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.delay(220),
        ])
      );

    const a0 = mkLoop(v0, 0);
    const a1 = mkLoop(v1, 150);
    const a2 = mkLoop(v2, 300);
    const a3 = mkLoop(v3, 450);

    a0.start();
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a0.stop();
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [v0, v1, v2, v3]);

  // Determinate "fake" progress, matching the provided snippet.
  useEffect(() => {
    if (!onComplete) return;
    let done = false;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (!done) {
            done = true;
            clearInterval(timer);
            setTimeout(onComplete, 300);
          }
          return 100;
        }
        return prev + 2;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [onComplete]);

  // Indeterminate progress bar animation when `onComplete` isn't provided.
  useEffect(() => {
    if (onComplete) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(indeterminate, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(indeterminate, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [indeterminate, onComplete]);

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
      { key: 'c0', v: v0, suit: 'spades' as const, value: 'A', base: styles.cardBase0, anim: makeStyle(v0, -68, -10, '-10deg') },
      { key: 'c1', v: v1, suit: 'hearts' as const, value: 'K', base: styles.cardBase1, anim: makeStyle(v1, -22, -18, '-2deg') },
      { key: 'c2', v: v2, suit: 'clubs' as const, value: 'Q', base: styles.cardBase2, anim: makeStyle(v2, 22, -18, '2deg') },
      { key: 'c3', v: v3, suit: 'diamonds' as const, value: 'J', base: styles.cardBase3, anim: makeStyle(v3, 68, -10, '10deg') },
    ];
  }, [v0, v1, v2, v3]);

  const barTranslateX = indeterminate.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 160],
  });

  return (
    <View style={[styles.screen, { backgroundColor }]}>
      <View style={styles.center}>
        <View style={styles.stackFrame}>
          {cards.map((c, idx) => (
            <Animated.View key={c.key} style={[styles.cardWrap, c.base, c.anim, { zIndex: idx }]}>
              <PlayingCard suit={c.suit} value={c.value} />
            </Animated.View>
          ))}
        </View>

        <Text style={styles.logo}>borgz</Text>

        <View style={styles.progressBar}>
          {onComplete ? (
            <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progress))}%` }]} />
          ) : (
            <Animated.View style={[styles.progressIndeterminate, { transform: [{ translateX: barTranslateX }] }]} />
          )}
        </View>

        <Text style={styles.loadingText}>{label || 'Loading…'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  stackFrame: {
    width: 320,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  cardWrap: {
    position: 'absolute',
  },
  cardBase0: {
    transform: [{ rotate: '-18deg' }],
  },
  cardBase1: {
    transform: [{ rotate: '-6deg' }],
  },
  cardBase2: {
    transform: [{ rotate: '6deg' }],
  },
  cardBase3: {
    transform: [{ rotate: '18deg' }],
  },
  logo: {
    fontSize: 44,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -0.6,
    marginBottom: 14,
  },
  progressBar: {
    width: 240,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#111',
    borderRadius: 999,
  },
  progressIndeterminate: {
    width: 80,
    height: '100%',
    backgroundColor: '#111',
    borderRadius: 999,
    opacity: 0.9,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
});

