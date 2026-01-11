import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** Size of the spinner */
  size?: 'small' | 'medium' | 'large';
  /** Optional label text */
  label?: string;
  /** Use light theme (for dark backgrounds) - default true for web */
  light?: boolean;
};

const SIZES = {
  small: { spinner: 20, dot: 4, gap: 6, fontSize: 12 },
  medium: { spinner: 32, dot: 6, gap: 8, fontSize: 14 },
  large: { spinner: 48, dot: 8, gap: 10, fontSize: 16 },
};

export function LoadingSpinner({ size = 'medium', label, light }: Props) {
  const isWeb = Platform.OS === 'web';
  const isLight = light ?? isWeb; // Default to light (white) on web

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const dims = SIZES[size];

  useEffect(() => {
    const createDotAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );
    };

    const anim1 = createDotAnimation(dot1, 0);
    const anim2 = createDotAnimation(dot2, 150);
    const anim3 = createDotAnimation(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    width: dims.dot,
    height: dims.dot,
    borderRadius: dims.dot / 2,
    backgroundColor: isLight ? '#22c55e' : '#111',
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.5],
        }),
      },
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -dims.dot],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });

  const textColor = isLight ? 'rgba(255,255,255,0.6)' : '#666';

  return (
    <View style={styles.container}>
      <View style={[styles.dotsContainer, { gap: dims.gap, height: dims.spinner }]}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>
      {label && (
        <Text style={[styles.label, { fontSize: dims.fontSize, color: textColor }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 12,
    fontWeight: '500',
  },
});
