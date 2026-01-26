import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useClubStore } from '../../store/clubStore';
import { useClubGameStore } from '../../store/clubGameStore';
import { useGameStore } from '../../store/gameStore';
import { useHistoryStore } from '../../store/historyStore';
import { LoadingScreen } from '../../components/LoadingScreen';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { GameSettingsForm } from '../../components/GameSettingsForm';
import { BuyInModal } from '../../components/BuyInModal';
import { GameSettings, GameState } from '../../../shared/types/game.types';

const isWeb = Platform.OS === 'web';
const SESSION_EXPIRED = 'SESSION_EXPIRED';

export default function ClubsScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const player = useAuthStore((s) => s.player);
  const logout = useAuthStore((s) => s.logout);
  const clubs = useClubStore((s) => s.clubs);
  const loading = useClubStore((s) => s.loading);
  const error = useClubStore((s) => s.error);
  const fetchMyClubs = useClubStore((s) => s.fetchMyClubs);
  const fetchClub = useClubStore((s) => s.fetchClub);
  const createClub = useClubStore((s) => s.createClub);
  const joinClub = useClubStore((s) => s.joinClub);

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

  const [clubName, setClubName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState<Partial<GameSettings>>({});
  const [expandedGameIds, setExpandedGameIds] = useState<Record<string, boolean>>({});

  // Buy-in modal state
  const [showBuyInModal, setShowBuyInModal] = useState(false);
  const [pendingGameCode, setPendingGameCode] = useState<string | null>(null);
  const [pendingGameState, setPendingGameState] = useState<GameState | null>(null);
  const [joiningGame, setJoiningGame] = useState(false);

  const normalizedInviteCode = useMemo(() => inviteCode.trim().toUpperCase(), [inviteCode]);
  const trimmedClubName = useMemo(() => clubName.trim(), [clubName]);
  const livePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clubsRef = useRef(clubs);

  const selectedClub = useMemo(
    () => (selectedClubId ? clubs.find((c) => c.id === selectedClubId) || null : null),
    [selectedClubId, clubs]
  );
  const clubGames = selectedClubId ? gamesByClubId[selectedClubId] || [] : [];
  const historyGames = selectedClubId ? historyGamesByClubId[selectedClubId] || [] : [];
  const historyLoading = selectedClubId ? historyLoadingByClubId[selectedClubId] || false : false;
  const historyError = selectedClubId ? historyErrorByClubId[selectedClubId] || null : null;

  useEffect(() => {
    clubsRef.current = clubs;
  }, [clubs]);

  useEffect(() => {
    if (!token) return;
    void fetchMyClubs(token);
  }, [token, fetchMyClubs]);

  // Handle session expiration - auto logout when token expires
  useEffect(() => {
    if (error === SESSION_EXPIRED) {
      logout();
      router.replace('/login');
    }
  }, [error, logout, router]);

  // Fetch club details when selected
  useEffect(() => {
    if (!token || !selectedClubId) return;
    void fetchClub(token, selectedClubId);
    void fetchClubGames(token, selectedClubId);
    void fetchClubHistory(token, selectedClubId);
  }, [token, selectedClubId, fetchClub, fetchClubGames, fetchClubHistory]);

  const refreshLive = useCallback(async () => {
    if (!token) return;
    const currentClubs = clubsRef.current || [];
    if (currentClubs.length === 0) return;
    await Promise.allSettled(currentClubs.map((c) => fetchClubGames(token, c.id)));
  }, [token, fetchClubGames]);

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

  useFocusEffect(
    useCallback(() => {
      if (!token) return () => undefined;
      void fetchMyClubs(token);
      void refreshLive();
      if (livePollRef.current) clearInterval(livePollRef.current);

      // Poll for club games - faster if a club is selected
      const pollInterval = selectedClubId ? 2500 : 6000;
      livePollRef.current = setInterval(() => {
        if (selectedClubId) {
          void fetchClubGames(token, selectedClubId);
        } else {
          void refreshLive();
        }
      }, pollInterval);

      return () => {
        if (livePollRef.current) clearInterval(livePollRef.current);
        livePollRef.current = null;
      };
    }, [token, fetchMyClubs, refreshLive, selectedClubId, fetchClubGames])
  );

  useEffect(() => {
    return () => {
      if (livePollRef.current) clearInterval(livePollRef.current);
    };
  }, []);

  // Use web or native styles
  const s = isWeb ? webStyles : styles;

  if (!token || !player) {
    return (
      <View style={[s.container, { padding: 16, flex: 1 }]}>
        <Text style={s.title}>Clubs</Text>
        <Text style={s.subtitle}>Please log in first.</Text>
      </View>
    );
  }

  if (loading && clubs.length === 0) {
    return isWeb ? (
      <View style={[s.container, { flex: 1, justifyContent: 'center' }]}>
        <LoadingSpinner size="large" label="Loading clubs..." light />
      </View>
    ) : (
      <LoadingScreen backgroundColor="#fff" />
    );
  }

  // Render club detail view
  if (selectedClubId && selectedClub) {
    return (
      <ScrollView style={s.scrollContainer} contentContainerStyle={s.container}>
        <View style={s.header}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{selectedClub.name}</Text>
              <Text style={s.subtitle}>
                {selectedClub.memberIds?.length ?? 0} members
                {selectedClub.inviteCode ? `  •  code ${selectedClub.inviteCode}` : ''}
              </Text>
            </View>
            <Pressable style={s.ghostButton} onPress={() => setSelectedClubId(null)}>
              <Text style={s.ghostButtonText}>← Back</Text>
            </Pressable>
          </View>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}
        {clubGameError ? <Text style={s.error}>{clubGameError}</Text> : null}
        {gameError ? <Text style={s.error}>{gameError}</Text> : null}

        {/* Active Games Section */}
        <View style={s.card}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Active games</Text>
            <Pressable
              style={s.ghostButton}
              disabled={clubGameLoading}
              onPress={() => void fetchClubGames(token, selectedClubId)}
            >
              <Text style={s.ghostButtonText}>{clubGameLoading ? 'Refreshing…' : 'Refresh'}</Text>
            </Pressable>
          </View>

          {clubGames.length === 0 ? (
            <Text style={s.emptyText}>No games yet. Create one below.</Text>
          ) : (
            clubGames.map((g, idx) => (
              <View key={g.gameId} style={[s.gameRow, idx === 0 ? s.gameRowFirst : null]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.gameTitle}>Game {g.code}</Text>
                  <Text style={s.gameMeta}>
                    {g.phase} • {g.playerCount} players
                  </Text>
                </View>
                <Pressable
                  style={s.primaryButtonSmall}
                  disabled={clubGameLoading || connected || joiningGame}
                  onPress={() => handleOpenBuyIn(g.code)}
                >
                  <Text style={s.primaryButtonTextSmall}>
                    {joiningGame && pendingGameCode === g.code ? 'Loading...' : 'Join'}
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Create New Game Section */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Create a new game</Text>
          <Pressable style={s.secondaryButton} onPress={() => setShowSettings(!showSettings)}>
            <Text style={s.secondaryButtonText}>
              {showSettings ? 'Hide Settings' : 'Show Settings'}
            </Text>
          </Pressable>

          {showSettings && (
            <View style={s.settingsContainer}>
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
            style={[s.primaryButton, { marginTop: 12 }]}
            disabled={clubGameLoading || joiningGame}
            onPress={async () => {
              const created = await createClubGame(token, selectedClubId, gameSettings);
              if (!created) return;
              // Open buy-in modal for the newly created game
              await handleOpenBuyIn(created.code);
            }}
          >
            <Text style={s.primaryButtonText}>
              {clubGameLoading ? 'Creating…' : 'Create & Join'}
            </Text>
          </Pressable>
        </View>

        {/* Game History Section */}
        <View style={s.card}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Game history</Text>
            <Pressable
              style={s.ghostButton}
              disabled={historyLoading}
              onPress={() => (token ? void fetchClubHistory(token, selectedClubId) : undefined)}
            >
              <Text style={s.ghostButtonText}>{historyLoading ? 'Refreshing…' : 'Refresh'}</Text>
            </Pressable>
          </View>

          {historyError ? <Text style={s.error}>{historyError}</Text> : null}

          {historyGames.length === 0 ? (
            <Text style={s.emptyText}>No history yet. Finish a hand in a club game.</Text>
          ) : (
            historyGames.map((g, idx) => {
              const expanded = !!expandedGameIds[g.gameId];
              const created = new Date(g.createdAt).toLocaleString();
              const ended = g.endedAt ? new Date(g.endedAt).toLocaleString() : 'active';
              return (
                <View key={g.gameId} style={[s.historyRow, idx === 0 ? s.historyRowFirst : null]}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => router.push(`/history/game/${g.gameId}?clubId=${selectedClubId}`)}
                  >
                    <Text style={s.gameTitle}>
                      {g.code} • {g.handsCount} hands
                    </Text>
                    <Text style={s.gameMeta}>
                      {created} → {ended}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={s.ghostButton}
                    onPress={() =>
                      setExpandedGameIds((prev) => ({ ...prev, [g.gameId]: !prev[g.gameId] }))
                    }
                  >
                    <Text style={s.ghostButtonText}>{expanded ? 'Hide' : 'Show'}</Text>
                  </Pressable>

                  {expanded && (
                    <View style={s.expandedHistory}>
                      {g.hands.length === 0 ? (
                        <Text style={s.emptyText}>No finished hands yet.</Text>
                      ) : (
                        g.hands.map((h) => {
                          const winners = h.winners.map((w) => `${w.playerId}:${w.amount}`).join(', ');
                          return (
                            <View key={`${g.gameId}:${h.handNumber}`} style={s.handRow}>
                              <Text style={s.handTitle}>
                                Hand #{h.handNumber} • {h.reason} • pot {h.pot}
                              </Text>
                              <Text style={s.handMeta}>
                                winners: {winners || '—'} • actions: {h.actions.length}
                              </Text>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
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

  // Render clubs list view
  return (
    <ScrollView style={s.scrollContainer} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Clubs</Text>
        <Text style={s.subtitle}>Create or join. See what's live.</Text>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.twoCol}>
        <View style={s.card}>
          <Text style={s.sectionTitle}>Create club</Text>
          <TextInput
            value={clubName}
            onChangeText={setClubName}
            placeholder="Name"
            placeholderTextColor={isWeb ? 'rgba(255,255,255,0.4)' : '#999'}
            autoCorrect={false}
            spellCheck={false}
            style={s.input}
          />
          <Pressable
            style={[s.primaryButton, !trimmedClubName ? s.buttonDisabled : null]}
            disabled={loading || !trimmedClubName}
            onPress={async () => {
              const created = await createClub(token, trimmedClubName);
              if (created) setClubName('');
            }}
          >
            <Text style={s.primaryButtonText}>{loading ? 'Creating…' : 'Create'}</Text>
          </Pressable>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Join club</Text>
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="Code"
            placeholderTextColor={isWeb ? 'rgba(255,255,255,0.4)' : '#999'}
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            style={s.input}
          />
          <Pressable
            style={[s.primaryButton, !normalizedInviteCode ? s.buttonDisabled : null]}
            disabled={loading || !normalizedInviteCode}
            onPress={async () => {
              const joined = await joinClub(token, normalizedInviteCode);
              if (joined) setInviteCode('');
            }}
          >
            <Text style={s.primaryButtonText}>{loading ? 'Joining…' : 'Join'}</Text>
          </Pressable>
          <Text style={s.helperText}>Tip: codes are 6–8 chars (A–Z, 0–9).</Text>
        </View>
      </View>

      <View style={[s.card, { marginTop: 2 }]}>
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Your clubs</Text>
          <Pressable style={s.ghostButton} onPress={() => void fetchMyClubs(token)} disabled={loading}>
            <Text style={s.ghostButtonText}>{loading ? 'Refreshing…' : 'Refresh'}</Text>
          </Pressable>
        </View>

        {clubs.length === 0 ? (
          <Text style={s.emptyText}>You're not in any clubs yet.</Text>
        ) : (
          clubs.map((c, idx) => {
            const liveGames = gamesByClubId[c.id] || [];
            const live = liveGames.length > 0;
            const preview = liveGames[0];
            return (
              <Pressable
                key={c.id}
                style={[s.clubRow, live ? s.clubRowLive : null, idx === 0 ? s.clubRowFirst : null]}
                onPress={() => (isWeb ? setSelectedClubId(c.id) : router.push(`/club/${c.id}`))}
                disabled={loading}
              >
                <View style={{ flex: 1 }}>
                  <View style={s.clubTitleRow}>
                    <Text style={s.clubName}>{c.name}</Text>
                    {live ? (
                      <View style={s.livePill}>
                        <Text style={s.livePillText}>LIVE</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={s.clubMeta}>
                    {c.memberIds?.length ?? 0} members
                    {c.inviteCode ? `  •  code ${c.inviteCode}` : ''}
                  </Text>

                  {live && preview ? (
                    <Text style={s.livePreview}>
                      Game {preview.code} • {preview.phase} • {preview.playerCount} players
                      {liveGames.length > 1 ? `  •  +${liveGames.length - 1} more` : ''}
                    </Text>
                  ) : (
                    <Text style={s.livePreviewMuted}>No live game right now.</Text>
                  )}
                </View>

                <Text style={s.chevron}>›</Text>
              </Pressable>
            );
          })
        )}
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

// Web styles - dark theme with glass morphism
const webStyles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 48,
    paddingTop: 32,
  },
  header: {
    width: '100%',
    maxWidth: 800,
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 10,
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  error: {
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 24,
    textAlign: 'center',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 800,
  },
  twoCol: {
    width: '100%',
    maxWidth: 800,
    flexDirection: 'row',
    gap: 24,
  },
  card: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 28,
    marginBottom: 24,
    backdropFilter: 'blur(10px)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  primaryButtonSmall: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonTextSmall: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
    fontSize: 14,
  },
  ghostButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  ghostButtonText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '700',
  },
  helperText: {
    marginTop: 12,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: 16,
  },
  clubRow: {
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clubRowFirst: {
    borderTopWidth: 0,
  },
  clubRowLive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  clubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  clubName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  clubMeta: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  livePill: {
    backgroundColor: '#22c55e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  livePillText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  livePreview: {
    marginTop: 8,
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  livePreviewMuted: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  chevron: {
    fontSize: 26,
    color: 'rgba(255, 255, 255, 0.3)',
    marginLeft: 8,
  },
  // Club detail styles
  gameRow: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  gameRowFirst: {
    borderTopWidth: 0,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  gameMeta: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  historyRow: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  historyRowFirst: {
    borderTopWidth: 0,
  },
  expandedHistory: {
    width: '100%',
    paddingTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  handRow: {
    paddingVertical: 8,
  },
  handTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  handMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  settingsContainer: {
    marginTop: 20,
  },
});

// Native styles - original light theme
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
  header: {
    width: '100%',
    maxWidth: 560,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
    textAlign: 'center',
  },
  twoCol: {
    width: '100%',
    maxWidth: 560,
    gap: 12,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
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
  },
  secondaryButtonText: {
    color: '#111',
    fontWeight: '700',
  },
  ghostButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    backgroundColor: '#fafafa',
  },
  ghostButtonText: {
    fontSize: 12,
    color: '#111',
    fontWeight: '800',
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: '#777',
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    paddingVertical: 8,
  },
  clubRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clubRowFirst: {
    borderTopWidth: 0,
  },
  clubRowLive: {
    backgroundColor: '#fcfcfc',
    borderRadius: 12,
    paddingHorizontal: 10,
    marginHorizontal: -10,
  },
  clubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '700',
  },
  clubMeta: {
    fontSize: 12,
    color: '#777',
  },
  livePill: {
    backgroundColor: '#111',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  livePillText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  livePreview: {
    marginTop: 6,
    fontSize: 12,
    color: '#111',
    fontWeight: '700',
  },
  livePreviewMuted: {
    marginTop: 6,
    fontSize: 12,
    color: '#888',
  },
  chevron: {
    fontSize: 26,
    color: '#bbb',
    marginLeft: 6,
    marginRight: 2,
  },
  // Club detail styles for native
  gameRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gameRowFirst: {
    borderTopWidth: 0,
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
  historyRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  historyRowFirst: {
    borderTopWidth: 0,
  },
  expandedHistory: {
    width: '100%',
    paddingTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#eee',
    marginTop: 6,
  },
  handRow: {
    paddingVertical: 6,
  },
  handTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  handMeta: {
    fontSize: 12,
    color: '#777',
  },
  settingsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
});
