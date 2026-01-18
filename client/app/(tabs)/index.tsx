import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { GameSettingsForm } from '../../components/GameSettingsForm';
import { BuyInModal } from '../../components/BuyInModal';
import { GameSettings, GameState } from '../../../shared/types/game.types';
import MagicBento from '../../components/MagicBento';

// Web-specific hero component with MagicBento navigation
function WebHero() {
  const router = useRouter();
  const { player, logout } = useAuthStore();
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
    <>
      <style>
        {`
          .bento-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            width: 100%;
            position: relative;
            z-index: 10;
          }
          
          .bento-header {
            position: absolute;
            top: 2rem;
            right: 2rem;
            display: flex;
            gap: 1rem;
            align-items: center;
            z-index: 100;
          }
          
          .user-info {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            padding: 8px 16px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            backdrop-filter: blur(10px);
          }
          
          .logout-btn {
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
            padding: 8px 16px;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            cursor: pointer;
            backdrop-filter: blur(10px);
            transition: all 0.2s;
          }
          
          .logout-btn:hover {
            background: rgba(239, 68, 68, 0.3);
            border-color: rgba(239, 68, 68, 0.5);
          }
          
          .bento-logo {
            position: absolute;
            top: 2rem;
            left: 2rem;
            font-size: 36px;
            font-weight: 900;
            color: #fff;
            letter-spacing: -1px;
            z-index: 100;
          }
          
          .join-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(10px);
          }
          
          .join-modal-content {
            background: #1a1a2e;
            border: 1px solid rgba(132, 0, 255, 0.3);
            border-radius: 20px;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            min-width: 300px;
          }
          
          .join-modal-title {
            font-size: 24px;
            font-weight: 700;
            color: #fff;
            margin-bottom: 1rem;
          }
          
          .join-modal-input {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 12px 16px;
            font-size: 16px;
            color: #fff;
            text-align: center;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          
          .join-modal-buttons {
            display: flex;
            gap: 1rem;
          }
          
          .join-modal-btn {
            flex: 1;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }
          
          .join-modal-btn-primary {
            background: #22c55e;
            color: #fff;
          }
          
          .join-modal-btn-primary:hover {
            background: #16a34a;
          }
          
          .join-modal-btn-secondary {
            background: transparent;
            color: rgba(255, 255, 255, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .join-modal-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.05);
          }
        `}
      </style>
      
      <div className="bento-wrapper">
        <div className="bento-logo">borgz</div>
        
        <div className="bento-header">
          <div className="user-info">👋 {player?.name}</div>
          <button className="logout-btn" onClick={() => { logout(); router.replace('/login'); }}>
            Logout
          </button>
        </div>

        <div className="card-grid">
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="132, 0, 255"
            title="Quick Play"
            description="Start a game instantly with default settings"
            onClick={handleQuickPlay}
          />
          
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="34, 197, 94"
            title="Join Game"
            description="Enter a game code to join"
            onClick={() => setShowJoinModal(true)}
          />
          
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="59, 130, 246"
            title="Clubs"
            description="Manage your poker clubs and memberships"
            onClick={() => router.push('/(tabs)/clubs')}
          />
          
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="236, 72, 153"
            title="Profile & Stats"
            description="View your games and statistics"
            onClick={() => router.push('/(tabs)/profile')}
          />
          
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="251, 191, 36"
            title="Coming Soon"
            description="More features on the way"
          />
          
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="168, 85, 247"
            title="Plus"
            description="Premium features and benefits"
            onClick={() => router.push('/(tabs)/plus')}
          />
        </div>

        {showJoinModal && (
          <div className="join-modal-overlay" onClick={() => setShowJoinModal(false)}>
            <div className="join-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="join-modal-title">Join Game</h2>
              <input
                type="text"
                className="join-modal-input"
                placeholder="Enter game code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
              <div className="join-modal-buttons">
                <button 
                  className="join-modal-btn join-modal-btn-secondary"
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="join-modal-btn join-modal-btn-primary"
                  onClick={() => {
                    handleJoinGame();
                    setShowJoinModal(false);
                  }}
                  disabled={joiningGame || !normalizedCode}
                >
                  {joiningGame ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BuyInModal
        visible={showBuyInModal}
        gameCode={pendingGameCode || ''}
        gameSettings={pendingGameState?.settings || null}
        onConfirm={handleConfirmBuyIn}
        onCancel={handleCancelBuyIn}
        loading={joiningGame}
      />
    </>
  );
}

const webStyles = StyleSheet.create({
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
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

