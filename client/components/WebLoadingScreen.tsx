import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, Dimensions } from 'react-native';

type Props = {
  onComplete?: () => void;
};

type CardData = {
  id: number;
  suit: 'spades' | 'hearts' | 'clubs' | 'diamonds';
  value: string;
  initialX: number;
  initialY: number;
  targetX: number;
  targetY: number;
  rotation: number;
  delay: number;
  scale: number;
};

const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
const VALUES = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
};

function getRandomCard(): { suit: typeof SUITS[number]; value: string } {
  return {
    suit: SUITS[Math.floor(Math.random() * SUITS.length)],
    value: VALUES[Math.floor(Math.random() * VALUES.length)],
  };
}

function AnimatedCard({ 
  card, 
  progress, 
  floatAnimation,
  index 
}: { 
  card: CardData; 
  progress: Animated.Value;
  floatAnimation: Animated.Value;
  index: number;
}) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const color = isRed ? '#ef4444' : '#fff';
  
  // Create unique float offsets per card for gentle floating effect
  const floatOffsetY = floatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(index * 0.8) * 12],
  });
  
  const floatOffsetX = floatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(index * 0.6) * 8],
  });

  // Entry animation interpolations
  const entryX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [card.initialX, card.targetX],
  });
  
  const entryY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [card.initialY, card.targetY],
  });

  const entryRotation = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', `${card.rotation * 2}deg`, `${card.rotation}deg`],
  });

  const entryScale = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.3, card.scale * 1.1, card.scale],
  });

  const entryOpacity = progress.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0.9],
  });

  return (
    <Animated.View 
      style={[
        styles.card, 
        {
          transform: [
            { translateX: Animated.add(entryX, floatOffsetX) },
            { translateY: Animated.add(entryY, floatOffsetY) },
            { rotate: entryRotation },
            { scale: entryScale },
          ],
          opacity: entryOpacity,
        }
      ]}
    >
      <View style={styles.cardInner}>
        <View style={styles.cardCorner}>
          <Text style={[styles.cardValue, { color }]}>{card.value}</Text>
          <Text style={[styles.cardSuit, { color }]}>{SUIT_SYMBOLS[card.suit]}</Text>
        </View>
        <Text style={[styles.cardCenterSuit, { color }]}>{SUIT_SYMBOLS[card.suit]}</Text>
        <View style={[styles.cardCorner, styles.cardCornerBR]}>
          <Text style={[styles.cardValue, { color }]}>{card.value}</Text>
          <Text style={[styles.cardSuit, { color }]}>{SUIT_SYMBOLS[card.suit]}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function WebLoadingScreen({ onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [cards, setCards] = useState<CardData[]>([]);
  const cardAnimations = useRef<Animated.Value[]>([]);
  const floatAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  
  const { width, height } = Dimensions.get('window');

  // Generate cards on mount
  useEffect(() => {
    const generatedCards: CardData[] = [];
    const numCards = 12;
    
    for (let i = 0; i < numCards; i++) {
      const { suit, value } = getRandomCard();
      const angle = (i / numCards) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.4;
      
      // Cards start from edges and corners
      const startPositions = [
        { x: -300, y: -300 },  // top-left
        { x: 300, y: -300 },   // top-right
        { x: -300, y: 300 },   // bottom-left
        { x: 300, y: 300 },    // bottom-right
        { x: 0, y: -400 },     // top
        { x: 0, y: 400 },      // bottom
        { x: -400, y: 0 },     // left
        { x: 400, y: 0 },      // right
      ];
      
      const startPos = startPositions[i % startPositions.length];
      
      generatedCards.push({
        id: i,
        suit,
        value,
        initialX: startPos.x + (Math.random() - 0.5) * 200,
        initialY: startPos.y + (Math.random() - 0.5) * 200,
        targetX: Math.cos(angle) * (radius * 0.3) + (Math.random() - 0.5) * 60,
        targetY: Math.sin(angle) * (radius * 0.25) + (Math.random() - 0.5) * 40,
        rotation: (Math.random() - 0.5) * 30,
        delay: i * 80,
        scale: 0.7 + Math.random() * 0.3,
      });
      
      cardAnimations.current.push(new Animated.Value(0));
    }
    
    setCards(generatedCards);
  }, [width, height]);

  // Animate cards flying in
  useEffect(() => {
    if (cards.length === 0) return;

    const animations = cardAnimations.current.map((anim, index) =>
      Animated.sequence([
        Animated.delay(cards[index]?.delay || 0),
        Animated.spring(anim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start();

    // Start the float animation loop (cards gently floating)
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimation, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimation, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    // Glow animation
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    return () => {
      floatLoop.stop();
      glowLoop.stop();
    };
  }, [cards, floatAnimation, glowAnimation]);

  // Progress counter
  useEffect(() => {
    let current = 0;
    const duration = 3000; // 3 seconds total
    const interval = 30;
    const increment = 100 / (duration / interval);
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
        setTimeout(() => onComplete?.(), 500);
      }
      setProgress(Math.floor(current));
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  const glowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />
      
      {/* Animated glow behind cards */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
      
      {/* Cards container */}
      <View style={styles.cardsContainer}>
        {cards.map((card, index) => (
          <AnimatedCard 
            key={card.id} 
            card={card} 
            progress={cardAnimations.current[index] || new Animated.Value(0)}
            floatAnimation={floatAnimation}
            index={index}
          />
        ))}
      </View>

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Logo */}
        <Text style={styles.logo}>borgz</Text>
        
        {/* Progress percentage */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{progress}</Text>
          <Text style={styles.progressPercent}>%</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>shuffling the deck...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
    // Web-specific gradient would go here
  },
  glow: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#22c55e',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(100px)',
    } : {}),
  },
  cardsContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: 80,
    height: 112,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(34, 197, 94, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
    }),
  },
  cardInner: {
    flex: 1,
    padding: 6,
  },
  cardCorner: {
    position: 'absolute',
    top: 6,
    left: 6,
    alignItems: 'center',
  },
  cardCornerBR: {
    top: undefined,
    left: undefined,
    right: 6,
    bottom: 6,
    transform: [{ rotate: '180deg' }],
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  cardSuit: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  cardCenterSuit: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 112,
    fontSize: 32,
    fontWeight: '800',
    opacity: 0.15,
  },
  centerContent: {
    alignItems: 'center',
    zIndex: 100,
  },
  logo: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
    marginBottom: 20,
    textTransform: 'lowercase',
    ...(Platform.OS === 'web' ? {
      textShadow: '0 0 40px rgba(34, 197, 94, 0.5)',
    } : {}),
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 80,
    fontWeight: '200',
    color: '#fff',
    lineHeight: 80,
    fontVariant: ['tabular-nums'],
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '300',
    color: '#666',
    marginBottom: 12,
    marginLeft: 4,
  },
  progressBar: {
    width: 200,
    height: 2,
    backgroundColor: '#333',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 1,
  },
  tagline: {
    marginTop: 24,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
