import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useClubStore } from '../../store/clubStore';
import { useClubGameStore } from '../../store/clubGameStore';
import { useGameStore } from '../../store/gameStore';
import { useHistoryStore } from '../../store/historyStore';
import { GameSettingsForm } from '../../components/GameSettingsForm';
import { BuyInModal } from '../../components/BuyInModal';
import { GameSettings, GameState } from '../../../shared/types/game.types';

export default function ClubDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clubId?: string }>();
  const clubId = typeof params.clubId === 'string' ? params.clubId : '';

  const token = useAuthStore((s) => s.token);
  const player = useAuthStore((s) => s.player);

  const clubs = useClubStore((s) => s.clubs);
  const clubError = useClubStore((s) => s.error);
  const fetchClub = useClubStore((s) => s.fetchClub);

  const gamesByClubId = useClubGameStore((s) => s.gamesByClubId);
  const clubGameLoading = useClubGameStore((s) => s.loading);
  const clubGameError = useClubGameStore((s) => s.error);
  const fetchClubGames = useClubGameStore((s) => s.fetchClubGames);
  const createClubGame = useClubGameStore((s) => s.createClubGame);

  const connected = useGameStore((s) => s.connected);
  const joinGame = useGameStore((s) => s.joinGame);
  const getGameInfo = useGameStore((s) => s.getGameInfo);
  const gameError = useGameStore((s) => s.error);

  const historyGamesByClubId = useHistoryStore((s) => s.clubGamesByClubId);
  const historyLoadingByClubId = useHistoryStore((s) => s.clubLoadingByClubId);
  const historyErrorByClubId = useHistoryStore((s) => s.clubErrorByClubId);
  const fetchClubHistory = useHistoryStore((s) => s.fetchClubHistory);

  const [showSettings, setShowSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState<Partial<GameSettings>>({});
  const [expandedGameIds, setExpandedGameIds] = useState<Record<string, boolean>>({});

  // Buy-in modal state
  const [showBuyInModal, setShowBuyInModal] = useState(false);
  const [pendingGameCode, setPendingGameCode] = useState<string | null>(null);
  const [pendingGameState, setPendingGameState] = useState<GameState | null>(null);
  const [joiningGame, setJoiningGame] = useState(false);

  const club = useMemo(() => clubs.find((c) => c.id === clubId) || null, [clubId, clubs]);
  const games = gamesByClubId[clubId] || [];
  const historyGames = historyGamesByClubId[clubId] || [];
  const historyLoading = historyLoadingByClubId[clubId] || false;
  const historyError = historyErrorByClubId[clubId] || null;

  useEffect(() => {
    if (!token || !clubId) return;
    void fetchClub(token, clubId);
    void fetchClubGames(token, clubId);
    void fetchClubHistory(token, clubId);
  }, [token, clubId, fetchClub, fetchClubGames, fetchClubHistory]);

  // Auto-refresh club games while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      if (!token || !clubId) return () => undefined;
      void fetchClubGames(token, clubId);
      const id = setInterval(() => {
        void fetchClubGames(token, clubId);
      }, 2500);
      return () => clearInterval(id);
    }, [token, clubId, fetchClubGames])
  );

  // Open buy-in modal for a game (or rejoin if already seated)
  const handleOpenBuyIn = useCallback(async (gameCode: string) => {
    setPendingGameCode(gameCode);
    setJoiningGame(true);
    const gameState = await getGameInfo(gameCode);
    setJoiningGame(false);
    
    if (gameState) {
      // Check if player is already seated in this game
      const alreadySeated = player && gameState.players.some(p => p.id === player.id);
      
      if (alreadySeated) {
        // Player is already in the game, just reconnect via socket
        useGameStore.setState({ gameCode, game: gameState, error: null });
        connect();
        const socket = await import('../../services/socket');
        socket.joinGame({ gameCode, playerId: player.id });
        router.replace('/(tabs)/game');
      } else {
        // Player needs to buy in
        setPendingGameState(gameState);
        setShowBuyInModal(true);
      }
    }
  }, [getGameInfo, player, connect, router]);

  // Confirm buy-in and join game
  const handleConfirmBuyIn = useCallback(async (buyIn: number) => {
    if (!player || !pendingGameCode) return;
    setJoiningGame(true);
    await joinGame(pendingGameCode, player.id, player.name, buyIn);
    setJoiningGame(false);
    if (!useGameStore.getState().error) {
      setShowBuyInModal(false);
      setPendingGameCode(null);
      setPendingGameState(null);
      router.replace('/(tabs)/game');
    }
  }, [player, pendingGameCode, joinGame, router]);

  // Cancel buy-in modal
  const handleCancelBuyIn = useCallback(() => {
    setShowBuyInModal(false);
    setPendingGameCode(null);
    setPendingGameState(null);
  }, []);

  if (!token || !player) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <Text style={styles.title}>Club</Text>
        <Text style={styles.subtitle}>Please log in first.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{club?.name || 'Club'}</Text>
          <Text style={styles.subtitle}>
            {club?.description ? club.description : 'Join an existing game or create a new one'}
          </Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
      </View>

      {clubError ? <Text style={styles.error}>{clubError}</Text> : null}
      {clubGameError ? <Text style={styles.error}>{clubGameError}</Text> : null}
      {gameError ? <Text style={styles.error}>{gameError}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Active games</Text>
        {games.length === 0 ? (
          <Text style={styles.subtitle}>No games yet. Create one below.</Text>
        ) : (
          games.map((g) => (
            <View key={g.gameId} style={styles.gameRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.gameTitle}>Game</Text>
                <Text style={styles.gameMeta}>
                  phase: {g.phase} • players: {g.playerCount}
                </Text>
              </View>
              <Pressable
                style={styles.primaryButtonSmall}
                disabled={clubGameLoading || connected || joiningGame}
                onPress={() => handleOpenBuyIn(g.code)}
              >
                <Text style={styles.primaryButtonTextSmall}>
                  {joiningGame && pendingGameCode === g.code ? '...' : 'Join'}
                </Text>
              </Pressable>
            </View>
          ))
        )}
        <Pressable
          style={styles.secondaryButton}
          disabled={clubGameLoading}
          onPress={() => void fetchClubGames(token, clubId)}
        >
          <Text style={styles.secondaryButtonText}>
            {clubGameLoading ? 'Refreshing…' : 'Refresh games'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Game history (all hands)</Text>
        {historyError ? <Text style={styles.error}>{historyError}</Text> : null}

        {historyGames.length === 0 ? (
          <Text style={styles.subtitle}>No history yet. Finish a hand in a club game.</Text>
        ) : (
          historyGames.map((g) => {
            const expanded = !!expandedGameIds[g.gameId];
            const created = new Date(g.createdAt).toLocaleString();
            const ended = g.endedAt ? new Date(g.endedAt).toLocaleString() : 'active';
            return (
              <View key={g.gameId} style={styles.gameRow}>
                <Pressable style={{ flex: 1 }} onPress={() => router.push(`/history/game/${g.gameId}?clubId=${clubId}`)}>
                  <Text style={styles.gameTitle}>{g.code} • hands: {g.handsCount}</Text>
                  <Text style={styles.gameMeta}>created: {created} • ended: {ended}</Text>
                  <Text style={[styles.gameMeta, { marginTop: 4 }]}>
                    Tap to open log • {expanded ? 'Hide inline' : 'Show inline'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => setExpandedGameIds((prev) => ({ ...prev, [g.gameId]: !prev[g.gameId] }))}
                >
                  <Text style={styles.secondaryButtonText}>{expanded ? 'Hide' : 'Show'}</Text>
                </Pressable>

                {expanded ? (
                  <View style={{ width: '100%', paddingTop: 10 }}>
                    {g.hands.length === 0 ? (
                      <Text style={styles.subtitle}>No finished hands yet.</Text>
                    ) : (
                      g.hands.map((h) => {
                        const winners = h.winners.map((w) => `${w.playerId}:${w.amount}`).join(', ');
                        return (
                          <View key={`${g.gameId}:${h.handNumber}`} style={{ paddingVertical: 6 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', marginBottom: 2 }}>
                              Hand #{h.handNumber} • {h.reason} • pot {h.pot}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#777' }}>
                              winners: {winners || '—'} • actions: {h.actions.length}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        <Pressable
          style={styles.secondaryButton}
          disabled={historyLoading}
          onPress={() => (token ? void fetchClubHistory(token, clubId) : undefined)}
        >
          <Text style={styles.secondaryButtonText}>{historyLoading ? 'Refreshing…' : 'Refresh history'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create a new game</Text>
        <Pressable style={styles.secondaryButton} onPress={() => setShowSettings(!showSettings)}>
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
          disabled={clubGameLoading || joiningGame}
          onPress={async () => {
            const created = await createClubGame(token, clubId, gameSettings);
            if (!created) return;
            // Open buy-in modal for the newly created game
            await handleOpenBuyIn(created.code);
          }}
        >
          <Text style={styles.primaryButtonText}>
            {clubGameLoading ? 'Creating…' : 'Create & Join'}
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
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
    textAlign: 'left',
  },
  card: {
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
  gameRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gameTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  gameMeta: {
    fontSize: 12,
    color: '#777',
  },
  primaryButton: {
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  primaryButtonSmall: {
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonTextSmall: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#111',
    fontWeight: '700',
  },
  settingsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
});


