import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { useHistoryStore } from '../../../store/historyStore';

function formatCard(c: { rank: string; suit: string }): string {
  return `${c.rank}${c.suit[0].toUpperCase()}`;
}

export default function GameHistoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameId?: string; clubId?: string; sessionId?: string }>();
  const gameId = typeof params.gameId === 'string' ? params.gameId : '';
  const clubId = typeof params.clubId === 'string' ? params.clubId : undefined;
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : undefined;

  const token = useAuthStore((s) => s.token);
  const player = useAuthStore((s) => s.player);

  const profileSessions = useHistoryStore((s) => s.profileSessions);
  const profileLoading = useHistoryStore((s) => s.profileLoading);
  const profileError = useHistoryStore((s) => s.profileError);
  const fetchMyHistory = useHistoryStore((s) => s.fetchMyHistory);

  const clubGamesByClubId = useHistoryStore((s) => s.clubGamesByClubId);
  const clubLoadingByClubId = useHistoryStore((s) => s.clubLoadingByClubId);
  const clubErrorByClubId = useHistoryStore((s) => s.clubErrorByClubId);
  const fetchClubHistory = useHistoryStore((s) => s.fetchClubHistory);

  const [expandedHands, setExpandedHands] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!token || !gameId) return;
    if (clubId) {
      // Ensure club history is available.
      void fetchClubHistory(token, clubId);
    } else {
      // Ensure profile history is available (for non-club games or personal sessions).
      void fetchMyHistory(token);
    }
  }, [token, gameId, clubId, fetchClubHistory, fetchMyHistory]);

  const loading = clubId ? !!clubLoadingByClubId[clubId] : profileLoading;
  const error = clubId ? clubErrorByClubId[clubId] : profileError;

  const clubGame = useMemo(() => {
    if (!clubId) return null;
    const games = clubGamesByClubId[clubId] || [];
    return games.find((g) => g.gameId === gameId) || null;
  }, [clubId, clubGamesByClubId, gameId]);

  const session = useMemo(() => {
    if (clubId) return null;
    if (!sessionId) return profileSessions.find((s) => s.gameId === gameId) || null;
    return profileSessions.find((s) => s.sessionId === sessionId) || null;
  }, [clubId, sessionId, profileSessions, gameId]);

  const title = useMemo(() => {
    const code = clubGame?.code || session?.code;
    if (code) return `Game ${code}`;
    return 'Game history';
  }, [clubGame, session]);

  const hands = useMemo(() => {
    if (clubGame) return clubGame.hands || [];
    if (session) return session.hands || [];
    return [];
  }, [clubGame, session]);

  const toggleHand = useCallback((handNumber: number) => {
    setExpandedHands((prev) => ({ ...prev, [handNumber]: !prev[handNumber] }));
  }, []);

  if (!token || !player) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <Text style={styles.title}>Game history</Text>
        <Text style={styles.subtitle}>Please log in first.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {clubId ? 'Club game log (all hands)' : 'Your session log (hands while you were seated)'}
          </Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Hands</Text>
        {loading ? <Text style={styles.subtitle}>Loading…</Text> : null}

        {hands.length === 0 && !loading ? (
          <Text style={styles.subtitle}>No hands to show yet.</Text>
        ) : (
          hands.map((h) => {
            const expanded = !!expandedHands[h.handNumber];
            const ended = new Date(h.endedAt).toLocaleString();
            const winners = h.winners.map((w) => `${w.playerId}:${w.amount}`).join(', ');
            return (
              <View key={h.handNumber} style={styles.handRow}>
                <View style={styles.handHeader}>
                  <Pressable style={{ flex: 1 }} onPress={() => toggleHand(h.handNumber)}>
                    <Text style={styles.handTitle}>
                      Hand #{h.handNumber} • {h.reason} • pot {h.pot} • {expanded ? 'Hide' : 'Show'}
                    </Text>
                    <Text style={styles.handMeta}>
                      ended: {ended} • winners: {winners || '—'} • actions: {h.actions.length}
                    </Text>
                  </Pressable>
                </View>

                {expanded ? (
                  <View style={styles.handDetail}>
                    <Text style={styles.detailLine}>
                      Board: {h.communityCards.length ? h.communityCards.map(formatCard).join(' ') : '(none)'}
                    </Text>
                    <Text style={styles.detailLine}>Winners: {winners || '—'}</Text>
                    <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Action log</Text>
                    {h.actions.length === 0 ? (
                      <Text style={styles.subtitle}>(no actions)</Text>
                    ) : (
                      h.actions
                        .slice()
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .map((a) => (
                          <Text key={`${a.timestamp}-${a.playerId}-${a.action}`} style={styles.logLine}>
                            {new Date(a.timestamp).toLocaleTimeString()} — {a.playerId}: {a.action}
                            {a.amount !== undefined ? ` ${a.amount}` : ''}
                          </Text>
                        ))
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>
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
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111',
  },
  secondaryButtonText: {
    color: '#111',
    fontWeight: '700',
  },
  handRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 10,
  },
  handHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  handTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  handMeta: {
    fontSize: 12,
    color: '#777',
  },
  handDetail: {
    marginTop: 10,
    paddingLeft: 10,
    paddingBottom: 4,
  },
  detailLine: {
    fontSize: 12,
    color: '#333',
    marginBottom: 6,
  },
  logLine: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
});


