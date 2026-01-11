import { useEffect, useRef, useState, ReactNode, createContext, useContext } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '../store/authStore';

// Store cards in module scope so they persist across re-renders
let cachedCards: CardData[] | null = null;
let cachedDimensions = { width: 0, height: 0 };

const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
const VALUES = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];
const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
};

type CardData = {
  id: number;
  suit: typeof SUITS[number];
  value: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  delay: number;
};

function generateCards(count: number, width: number, height: number): CardData[] {
  const cards: CardData[] = [];
  const cols = Math.ceil(Math.sqrt(count * (width / height)));
  const rows = Math.ceil(count / cols);
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    cards.push({
      id: i,
      suit: SUITS[Math.floor(Math.random() * SUITS.length)],
      value: VALUES[Math.floor(Math.random() * VALUES.length)],
      x: col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * cellWidth * 0.5,
      y: row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * cellHeight * 0.5,
      rotation: (Math.random() - 0.5) * 30,
      scale: 0.6 + Math.random() * 0.4,
      delay: i * 50,
    });
  }
  return cards;
}

function FloatingCard({ card, floatAnim }: { card: CardData; floatAnim: Animated.Value }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const color = isRed ? '#ef4444' : '#1a1a2e';

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(card.id * 0.5) * 15],
  });

  const floatRotate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${card.rotation}deg`, `${card.rotation + Math.sin(card.id) * 3}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.floatingCard,
        {
          left: card.x - 40,
          top: card.y - 56,
          transform: [
            { translateY: floatY },
            { rotate: floatRotate },
            { scale: card.scale },
          ],
        },
      ]}
    >
      <View style={styles.cardCorner}>
        <Text style={[styles.cardValue, { color }]}>{card.value}</Text>
        <Text style={[styles.cardSuit, { color }]}>{SUIT_SYMBOLS[card.suit]}</Text>
      </View>
      <Text style={[styles.cardCenter, { color }]}>{SUIT_SYMBOLS[card.suit]}</Text>
    </Animated.View>
  );
}

function AnimatedCardBackground() {
  const { width, height } = Dimensions.get('window');
  
  // Use cached cards if dimensions haven't changed significantly
  const [cards] = useState(() => {
    if (cachedCards && 
        Math.abs(cachedDimensions.width - width) < 100 && 
        Math.abs(cachedDimensions.height - height) < 100) {
      return cachedCards;
    }
    cachedCards = generateCards(24, width, height);
    cachedDimensions = { width, height };
    return cachedCards;
  });
  
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  if (Platform.OS === 'web') {
    return (
      <>
        <style>
          {`
            @keyframes cardFloat {
              0%, 100% { transform: translateY(0) rotate(var(--rotation)); }
              50% { transform: translateY(-15px) rotate(calc(var(--rotation) + 3deg)); }
            }
            @keyframes bgGradient {
              0%, 100% { background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0f172a 100%); }
              50% { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0a0a0a 100%); }
            }
            .card-bg {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              animation: bgGradient 20s ease-in-out infinite;
              overflow: hidden;
            }
            .floating-card {
              position: absolute;
              width: 80px;
              height: 112px;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 8px;
              backdrop-filter: blur(4px);
              animation: cardFloat 4s ease-in-out infinite;
              display: flex;
              flex-direction: column;
              padding: 8px;
            }
            .card-corner {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .card-value {
              font-size: 14px;
              font-weight: 900;
              line-height: 1;
            }
            .card-suit-small {
              font-size: 12px;
              font-weight: 700;
            }
            .card-center {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 28px;
              opacity: 0.15;
            }
          `}
        </style>
        <div className="card-bg">
          {cards.map((card) => {
            const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
            const color = isRed ? '#ef4444' : 'rgba(255,255,255,0.7)';
            return (
              <div
                key={card.id}
                className="floating-card"
                style={{
                  left: card.x - 40,
                  top: card.y - 56,
                  '--rotation': `${card.rotation}deg`,
                  animationDelay: `${card.delay}ms`,
                  transform: `scale(${card.scale})`,
                } as any}
              >
                <div className="card-corner">
                  <span className="card-value" style={{ color }}>{card.value}</span>
                  <span className="card-suit-small" style={{ color }}>{SUIT_SYMBOLS[card.suit]}</span>
                </div>
                <span className="card-center" style={{ color }}>{SUIT_SYMBOLS[card.suit]}</span>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <View style={styles.cardBackground}>
      {cards.map((card) => (
        <FloatingCard key={card.id} card={card} floatAnim={floatAnim} />
      ))}
    </View>
  );
}

function UserDropdown({ onLogout, onProfile }: { onLogout: () => void; onProfile: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const player = useAuthStore((s) => s.player);

  return (
    <View style={styles.dropdownContainer}>
      <Pressable 
        style={styles.avatar} 
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.avatarText}>
          {player?.name?.charAt(0).toUpperCase() || 'U'}
        </Text>
      </Pressable>
      
      {isOpen && (
        <>
          <Pressable style={styles.dropdownOverlay} onPress={() => setIsOpen(false)} />
          <View style={styles.dropdown}>
            <Pressable style={styles.dropdownItem} onPress={() => { setIsOpen(false); onProfile(); }}>
              <Text style={styles.dropdownText}>Profile</Text>
            </Pressable>
            <View style={styles.dropdownDivider} />
            <Pressable style={styles.dropdownItem} onPress={() => { setIsOpen(false); onLogout(); }}>
              <Text style={[styles.dropdownText, styles.logoutText]}>Logout</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

type NavItem = {
  label: string;
  route: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Play', route: '/(tabs)' },
  { label: 'Clubs', route: '/(tabs)/clubs' },
  { label: 'Games and Statistics', route: '/(tabs)/profile' },
  { label: 'About', route: '/(tabs)' },
];

type WebHomePageProps = {
  children?: ReactNode;
};

export function WebHomePage({ children }: WebHomePageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();

  // Determine active nav based on current path
  const getActiveNav = () => {
    if (pathname.includes('/clubs')) return 'Clubs';
    if (pathname.includes('/profile')) return 'Games and Statistics';
    if (pathname.includes('/game')) return 'Play';
    return 'Play';
  };

  const handleNavClick = (item: NavItem) => {
    router.push(item.route as any);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleProfile = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <View style={styles.container}>
      <AnimatedCardBackground />
      
      {/* Navigation Bar */}
      <View style={styles.navbar}>
        {/* Logo - Left */}
        <Pressable onPress={() => router.push('/(tabs)')}>
          <Text style={styles.logo}>borgz</Text>
        </Pressable>

        {/* Menu - Center */}
        <View style={styles.navMenu}>
          {NAV_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              style={styles.navItem}
              onPress={() => handleNavClick(item)}
            >
              <Text style={[
                styles.navText,
                getActiveNav() === item.label && styles.navTextActive
              ]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* User Avatar - Right */}
        <UserDropdown onLogout={handleLogout} onProfile={handleProfile} />
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
  },
  floatingCard: {
    position: 'absolute',
    width: 80,
    height: 112,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 8,
  },
  cardCorner: {
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  cardSuit: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    fontSize: 28,
    opacity: 0.15,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 100,
  },
  logo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  navMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navItem: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  navTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dropdownContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  dropdownOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 160,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    zIndex: 100,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    } : {}),
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  logoutText: {
    color: '#ef4444',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
