import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { GameSettingsForm } from '../../components/GameSettingsForm';
import { BuyInModal } from '../../components/BuyInModal';
import { GameSettings, GameState } from '../../../shared/types/game.types';

// Web-specific hero component
function WebHero() {
  const router = useRouter();
  const { player } = useAuthStore();
  const gameStore = useGameStore();
  const [code, setCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Buy-in modal state
  const [showBuyInModal, setShowBuyInModal] = useState(false);
  const [pendingGameCode, setPendingGameCode] = useState<string | null>(null);
  const [pendingGameState, setPendingGameState] = useState<GameState | null>(null);
  const [joiningGame, setJoiningGame] = useState(false);
  
  const normalizedCode = useMemo(() => code.trim().toUpperCase(), [code]);

  // Open buy-in modal for a game
  const handleOpenBuyIn = useCallback(async (gameCode: string) => {
    setPendingGameCode(gameCode);
    setJoiningGame(true);
    const gameState = await gameStore.getGameInfo(gameCode);
    setJoiningGame(false);
    if (gameState) {
      setPendingGameState(gameState);
      setShowBuyInModal(true);
      setShowJoinModal(false);
    }
  }, [gameStore]);

  // Confirm buy-in and join game
  const handleConfirmBuyIn = useCallback(async (buyIn: number) => {
    if (!player || !pendingGameCode) return;
    setJoiningGame(true);
    await gameStore.joinGame(pendingGameCode, player.id, player.name, buyIn);
    setJoiningGame(false);
    if (!useGameStore.getState().error) {
      setShowBuyInModal(false);
      setPendingGameCode(null);
      setPendingGameState(null);
      router.push('/(tabs)/game');
    }
  }, [player, pendingGameCode, gameStore, router]);

  // Cancel buy-in modal
  const handleCancelBuyIn = useCallback(() => {
    setShowBuyInModal(false);
    setPendingGameCode(null);
    setPendingGameState(null);
  }, []);

  const handleQuickPlay = async () => {
    if (!player) return;
    try {
      const newCode = await gameStore.createGame({});
      // Open buy-in modal for quick play game
      await handleOpenBuyIn(newCode);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create game';
      useGameStore.setState({ error: msg });
    }
  };

  const handleJoinGame = async () => {
    if (!player || !normalizedCode) return;
    await handleOpenBuyIn(normalizedCode);
  };

  return (
    <View style={webStyles.heroContainer}>
      {gameStore.error && (
        <Pressable onPress={() => useGameStore.setState({ error: null })}>
          <Text style={webStyles.error}>{gameStore.error}</Text>
        </Pressable>
      )}
      
      <View style={webStyles.buttonRow}>
        <Pressable style={webStyles.quickPlayButton} onPress={handleQuickPlay} disabled={joiningGame}>
          <Text style={webStyles.quickPlayButtonText}>
            {joiningGame ? 'Loading...' : 'Quick Play'}
          </Text>
        </Pressable>
        
        <Pressable 
          style={webStyles.joinButton} 
          onPress={() => setShowJoinModal(!showJoinModal)}
        >
          <Text style={webStyles.joinButtonText}>Join Game</Text>
        </Pressable>
      </View>

      {showJoinModal && (
        <View style={webStyles.joinModal}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Enter game code"
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="characters"
            style={webStyles.codeInput}
          />
          <Pressable 
            style={webStyles.joinSubmitButton} 
            onPress={handleJoinGame}
            disabled={joiningGame}
          >
            <Text style={webStyles.joinSubmitText}>
              {joiningGame ? '...' : 'Join'}
            </Text>
          </Pressable>
        </View>
      )}

      <BuyInModal
        visible={showBuyInModal}
        gameCode={pendingGameCode || ''}
        gameSettings={pendingGameState?.settings || null}
        onConfirm={handleConfirmBuyIn}
        onCancel={handleCancelBuyIn}
        loading={joiningGame}
      />
    </View>
  );
}

const webStyles = StyleSheet.create({
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  error: {
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quickPlayButton: {
    backgroundColor: '#000',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickPlayButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  joinButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  joinModal: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  codeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    width: 200,
    textAlign: 'center',
    letterSpacing: 2,
  },
  joinSubmitButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  joinSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default function LobbyScreen() {
  const router = useRouter();
  const { player, logout } = useAuthStore();
  const gameStore = useGameStore();
  const [code, setCode] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState<Partial<GameSettings>>({});

  // Buy-in modal state
  const [showBuyInModal, setShowBuyInModal] = useState(false);
  const [pendingGameCode, setPendingGameCode] = useState<string | null>(null);
  const [pendingGameState, setPendingGameState] = useState<GameState | null>(null);
  const [joiningGame, setJoiningGame] = useState(false);

  const normalizedCode = useMemo(() => code.trim().toUpperCase(), [code]);

  // Open buy-in modal for a game
  const handleOpenBuyIn = useCallback(async (gameCode: string) => {
    setPendingGameCode(gameCode);
    setJoiningGame(true);
    const gameState = await gameStore.getGameInfo(gameCode);
    setJoiningGame(false);
    if (gameState) {
      setPendingGameState(gameState);
      setShowBuyInModal(true);
    }
  }, [gameStore]);

  // Confirm buy-in and join game
  const handleConfirmBuyIn = useCallback(async (buyIn: number) => {
    if (!player || !pendingGameCode) return;
    setJoiningGame(true);
    await gameStore.joinGame(pendingGameCode, player.id, player.name, buyIn);
    setJoiningGame(false);
    if (!useGameStore.getState().error) {
      setShowBuyInModal(false);
      setPendingGameCode(null);
      setPendingGameState(null);
      router.push('/(tabs)/game');
    }
  }, [player, pendingGameCode, gameStore, router]);

  // Cancel buy-in modal
  const handleCancelBuyIn = useCallback(() => {
    setShowBuyInModal(false);
    setPendingGameCode(null);
    setPendingGameState(null);
  }, []);

  // On web, show the hero component
  if (Platform.OS === 'web') {
    return <WebHero />;
  }

  if (!player) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <Text style={styles.title}>Poker Lobby</Text>
        <Text style={styles.subtitle}>Please log in first.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Poker Lobby</Text>
      <Text style={styles.subtitle}>Create or join a game</Text>

      {gameStore.error ? (
        <Text style={styles.error}>{gameStore.error}</Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Logged in as</Text>
        <Text style={styles.subtitle}>
          {'avatar' in player && player.avatar ? `${player.avatar} ` : ''}
          {player.name}
        </Text>
        <Text style={[styles.subtitle, { fontSize: 12 }]}>playerId: {player.id}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => void logout()}>
          <Text style={styles.secondaryButtonText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Join game</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Enter code (e.g. ABC123)"
          autoCapitalize="characters"
          style={styles.input}
        />
        <Pressable
          style={styles.primaryButton}
          onPress={() => handleOpenBuyIn(normalizedCode)}
          disabled={joiningGame}
        >
          <Text style={styles.primaryButtonText}>
            {joiningGame ? 'Loading...' : 'Join'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create game</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setShowSettings(!showSettings)}
        >
          <Text style={styles.secondaryButtonText}>
            {showSettings ? 'Hide Settings' : 'Show Settings'}
          </Text>
        </Pressable>
        {showSettings && (
          <View style={styles.settingsContainer}>
            <GameSettingsForm
              initialSettings={gameSettings}
              onSubmit={(settings) => {
                setGameSettings(settings);
                setShowSettings(false);
              }}
              onCancel={() => setShowSettings(false)}
            />
          </View>
        )}
        <Pressable
          style={styles.primaryButton}
          onPress={async () => {
            try {
              const newCode = await gameStore.createGame(gameSettings);
              // Open buy-in modal for the newly created game
              await handleOpenBuyIn(newCode);
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Failed to create game';
              useGameStore.setState({ error: msg });
            }
          }}
          disabled={joiningGame}
        >
          <Text style={styles.primaryButtonText}>
            {joiningGame ? 'Loading...' : 'Create & Join'}
          </Text>
        </Pressable>
      </View>

      <BuyInModal
        visible={showBuyInModal}
        gameCode={pendingGameCode || ''}
        gameSettings={pendingGameState?.settings || null}
        onConfirm={handleConfirmBuyIn}
        onCancel={handleCancelBuyIn}
        loading={joiningGame}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111',
  },
  secondaryButtonText: {
    color: '#111',
    fontWeight: '700',
  },
  settingsContainer: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
});

