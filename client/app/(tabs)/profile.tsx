import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useClubStore } from '../../store/clubStore';
import { useHistoryStore } from '../../store/historyStore';
import { DepthBucket, PreflopPositionStats, useStatsStore } from '../../store/statsStore';
import { PokerVariant } from '../../../shared/types/game.types';

const isWeb = Platform.OS === 'web';

// Session expired indicator from stats store
const SESSION_EXPIRED = 'SESSION_EXPIRED';

export default function ProfileScreen() {
  const router = useRouter();
  const { token, player, logout } = useAuthStore();
  const history = useHistoryStore();
  const fetchMyClubs = useClubStore((s) => s.fetchMyClubs);
  const clubs = useClubStore((s) => s.clubs);

  const fetchMyStats = useStatsStore((s) => s.fetchMyStats);
  const statsLoading = useStatsStore((s) => s.loading);
  const statsError = useStatsStore((s) => s.error);
  const summary = useStatsStore((s) => s.summary);
  const gamesInRange = useStatsStore((s) => s.gamesInRange);
  const vsOpponents = useStatsStore((s) => s.vsOpponents);
  const preflop = useStatsStore((s) => s.preflop);

  // Handle session expiration - auto logout when token expires
  useEffect(() => {
    if (statsError === SESSION_EXPIRED || history.profileError === SESSION_EXPIRED) {
      logout();
      router.replace('/login');
    }
  }, [statsError, history.profileError, logout, router]);

  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  const [rangePreset, setRangePreset] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [clubIdx, setClubIdx] = useState<number>(-1);
  const [variant, setVariant] = useState<PokerVariant | 'all'>('all');
  const [depthBucket, setDepthBucket] = useState<DepthBucket | 'all'>('all');
  const [gameIdx, setGameIdx] = useState<number>(-1);

  useEffect(() => {
    if (!token) return;
    void history.fetchMyHistory(token);
    void fetchMyClubs(token);
  }, [token, history.fetchMyHistory, fetchMyClubs]);

  useEffect(() => {
    if (clubIdx >= clubs.length) setClubIdx(-1);
  }, [clubIdx, clubs.length]);
  useEffect(() => {
    if (gameIdx >= gamesInRange.length) setGameIdx(-1);
  }, [gameIdx, gamesInRange.length]);

  useEffect(() => {
    if (!token || !player) return;
    const now = Date.now();
    const from =
      rangePreset === '7d'
        ? now - 7 * 24 * 60 * 60 * 1000
        : rangePreset === '30d'
          ? now - 30 * 24 * 60 * 60 * 1000
          : rangePreset === '90d'
            ? now - 90 * 24 * 60 * 60 * 1000
            : undefined;

    const clubId = clubIdx >= 0 ? clubs[clubIdx]?.id : undefined;
    const gameId = gameIdx >= 0 ? gamesInRange[gameIdx]?.gameId : undefined;

    void fetchMyStats(token, {
      from,
      to: rangePreset === 'all' ? undefined : now,
      clubId,
      gameId,
      variant: variant === 'all' ? undefined : variant,
      depthBucket: depthBucket === 'all' ? undefined : depthBucket,
    });
  }, [token, player, rangePreset, clubIdx, clubs, gameIdx, variant, depthBucket, fetchMyStats]);

  const sessions = history.profileSessions;

  const title = useMemo(() => {
    if (!player) return 'Games and Statistics';
    return `Games and Statistics`;
  }, [player]);

  const preflopRows = useMemo(() => preflop?.byPosition || [], [preflop]);

  // Use web or native styles
  const s = isWeb ? webStyles : styles;

  function pct(n: number, d: number): string {
    if (!d) return '—';
    return `${Math.round((n / d) * 100)}%`;
  }

  function renderPreflopRow(r: PreflopPositionStats) {
    return (
      <View key={r.position} style={s.preflopRow}>
        <Text style={[s.preflopCell, s.preflopPos]}>{r.position}</Text>
        <Text style={s.preflopCell}>{pct(r.openRaiseCount, r.openOpps)}</Text>
        <Text style={s.preflopCell}>{pct(r.pfrCount, r.hands)}</Text>
        <Text style={s.preflopCell}>{pct(r.threeBetCount, r.threeBetOpps)}</Text>
        <Text style={s.preflopCell}>{pct(r.fourBetCount, r.fourBetOpps)}</Text>
      </View>
    );
  }

  if (!token || !player) {
    return (
      <View style={[s.container, { padding: 16, flex: 1 }]}>
        <Text style={s.title}>Games and Statistics</Text>
        <Text style={s.subtitle}>Please log in first.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.scrollContainer} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>Your performance across all games</Text>
      </View>

      {history.profileError ? <Text style={s.error}>{history.profileError}</Text> : null}

      <View style={[s.card, { marginBottom: 24 }]}>
        <Text style={s.sectionTitle}>Performance Stats</Text>
        {statsError ? <Text style={s.error}>{statsError}</Text> : null}

        <View style={s.filtersRow}>
          {(['7d', '30d', '90d', 'all'] as const).map((p) => (
            <Pressable
              key={p}
              style={[s.chip, rangePreset === p ? s.chipActive : null]}
              onPress={() => setRangePreset(p)}
            >
              <Text style={[s.chipText, rangePreset === p ? s.chipTextActive : null]}>
                {p === 'all' ? 'All time' : p}
              </Text>
            </Pressable>
          ))}

          <Pressable
            style={s.resetChip}
            onPress={() => {
              setRangePreset('all');
              setClubIdx(-1);
              setVariant('all');
              setDepthBucket('all');
              setGameIdx(-1);
            }}
          >
            <Text style={s.resetChipText}>Reset</Text>
          </Pressable>
        </View>

        <View style={s.filtersRow}>
          <Pressable
            style={s.chip}
            onPress={() => setClubIdx((prev) => (clubs.length ? ((prev + 2) % (clubs.length + 1)) - 1 : -1))}
          >
            <Text style={s.chipText}>Club: {clubIdx >= 0 ? clubs[clubIdx]?.name || '—' : 'All'}</Text>
          </Pressable>

          <Pressable
            style={s.chip}
            onPress={() => {
              const order: Array<PokerVariant | 'all'> = ['all', 'texas-holdem', 'omaha', 'omaha-hi-lo'];
              const idx = order.indexOf(variant);
              setVariant(order[(idx + 1) % order.length]);
            }}
          >
            <Text style={s.chipText}>Variant: {variant}</Text>
          </Pressable>

          <Pressable
            style={s.chip}
            onPress={() => {
              const order: Array<DepthBucket | 'all'> = ['all', '0-50', '50-100', '100-150', '150-500', '500+'];
              const idx = order.indexOf(depthBucket);
              setDepthBucket(order[(idx + 1) % order.length]);
            }}
          >
            <Text style={s.chipText}>Depth: {depthBucket}</Text>
          </Pressable>

          <Pressable
            style={s.chip}
            onPress={() =>
              setGameIdx((prev) => (gamesInRange.length ? ((prev + 2) % (gamesInRange.length + 1)) - 1 : -1))
            }
          >
            <Text style={s.chipText}>Game: {gameIdx >= 0 ? gamesInRange[gameIdx]?.code || '—' : 'All'}</Text>
          </Pressable>
        </View>

        {summary ? (
          <View style={{ marginTop: 16 }}>
            <View style={s.statsGrid}>
              <View style={s.statBox}>
                <Text style={s.statValue}>{summary.totalHands}</Text>
                <Text style={s.statLabel}>Hands</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statValue}>{summary.winPercentage.toFixed(1)}%</Text>
                <Text style={s.statLabel}>Win Rate</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statValue, summary.totalWinnings >= 0 ? s.statPositive : s.statNegative]}>
                  {summary.totalWinnings >= 0 ? '+' : ''}{summary.totalWinnings}
                </Text>
                <Text style={s.statLabel}>Net Chips</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statValue}>{summary.bb100 === null ? '—' : summary.bb100.toFixed(1)}</Text>
                <Text style={s.statLabel}>bb/100</Text>
              </View>
            </View>

            <View style={[s.statsGrid, { marginTop: 12 }]}>
              <View style={s.statBox}>
                <Text style={s.statValue}>{summary.vpip.toFixed(1)}</Text>
                <Text style={s.statLabel}>VPIP</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statValue}>{summary.pfr.toFixed(1)}</Text>
                <Text style={s.statLabel}>PFR</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statValue}>{summary.threeBetPercentage.toFixed(1)}</Text>
                <Text style={s.statLabel}>3-Bet %</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statValue}>{summary.aggressionFactor.toFixed(2)}</Text>
                <Text style={s.statLabel}>AF</Text>
              </View>
            </View>

            <Text style={[s.muted, { marginTop: 12 }]}>
              {statsLoading ? 'Refreshing…' : 'WTSD: ' + summary.wtsd.toFixed(1) + ' • W$SD: ' + summary.wsd.toFixed(1) + ' • C-Bet: ' + summary.cbetPercentage.toFixed(1)}
            </Text>

            {vsOpponents.length ? (
              <View style={{ marginTop: 20 }}>
                <Text style={s.sectionTitle}>Top Opponents</Text>
                {vsOpponents.slice(0, 5).map((o) => (
                  <View key={o.opponentId} style={s.opponentRow}>
                    <Text style={s.opponentName}>{o.opponentId}</Text>
                    <Text style={s.opponentStats}>
                      {o.handsTogether} hands • {o.totalWinnings >= 0 ? '+' : ''}{o.totalWinnings} chips
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ marginTop: 20 }}>
              <Text style={s.sectionTitle}>Preflop by Position</Text>
              <View style={s.preflopRow}>
                <Text style={[s.preflopCell, s.preflopHeader, s.preflopPos]}>Pos</Text>
                <Text style={[s.preflopCell, s.preflopHeader]}>RFI</Text>
                <Text style={[s.preflopCell, s.preflopHeader]}>PFR</Text>
                <Text style={[s.preflopCell, s.preflopHeader]}>3B</Text>
                <Text style={[s.preflopCell, s.preflopHeader]}>4B</Text>
              </View>
              {preflopRows.length ? (
                preflopRows.map(renderPreflopRow)
              ) : (
                <Text style={s.muted}>No positional preflop data yet.</Text>
              )}
            </View>
          </View>
        ) : (
          <Text style={s.muted}>{statsLoading ? 'Loading…' : 'No stats yet. Finish a hand first.'}</Text>
        )}
      </View>

      <View style={s.card}>
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Session History</Text>
          <Pressable style={s.ghostButton} onPress={() => void history.fetchMyHistory(token)}>
            <Text style={s.ghostButtonText}>{history.profileLoading ? 'Refreshing…' : 'Refresh'}</Text>
          </Pressable>
        </View>
        
        {sessions.length === 0 ? (
          <Text style={s.muted}>No history yet. Join a table and finish a hand.</Text>
        ) : (
          sessions.map((ses) => {
            const expanded = !!expandedSessionIds[ses.sessionId];
            const joined = new Date(ses.joinedAt).toLocaleString();
            const left = ses.leftAt ? new Date(ses.leftAt).toLocaleString() : 'still seated';
            const label = ses.clubId ? 'Club' : 'Open';
            return (
              <View key={ses.sessionId} style={s.row}>
                <View style={s.rowHeader}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() =>
                      setExpandedSessionIds((prev) => ({ ...prev, [ses.sessionId]: !prev[ses.sessionId] }))
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <View style={s.sessionTitleRow}>
                        <Text style={s.rowTitle}>{ses.code}</Text>
                        <View style={s.sessionTypePill}>
                          <Text style={s.sessionTypePillText}>{label}</Text>
                        </View>
                      </View>
                      <Text style={s.rowMeta}>
                        {joined} → {left} • {ses.handsCount} hands
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={s.logButton}
                    onPress={() => router.push(`/history/game/${ses.gameId}?sessionId=${ses.sessionId}`)}
                  >
                    <Text style={s.logButtonText}>View</Text>
                  </Pressable>

                  <Text style={s.chev}>{expanded ? '▼' : '▶'}</Text>
                </View>

                {expanded ? (
                  <View style={s.handsContainer}>
                    {ses.hands.length === 0 ? (
                      <Text style={s.muted}>No finished hands in this session yet.</Text>
                    ) : (
                      ses.hands.map((h) => {
                        const ended = new Date(h.endedAt).toLocaleString();
                        const winners = h.winners.map((w) => `${w.playerId}:${w.amount}`).join(', ');
                        return (
                          <View key={`${ses.sessionId}:${h.handNumber}`} style={s.handRow}>
                            <Text style={s.handTitle}>
                              Hand #{h.handNumber} • {h.reason} • pot {h.pot}
                            </Text>
                            <Text style={s.handMeta}>
                              {ended} • winners: {winners || '—'}
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
      </View>
    </ScrollView>
  );
}

// Web styles - dark theme
const webStyles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    padding: 48,
    paddingTop: 32,
  },
  header: {
    marginBottom: 32,
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
  },
  error: {
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 28,
    marginBottom: 24,
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
    marginBottom: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  chipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
  },
  resetChip: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  resetChipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statPositive: {
    color: '#22c55e',
  },
  statNegative: {
    color: '#ef4444',
  },
  opponentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  opponentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  opponentStats: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  muted: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    marginTop: 8,
  },
  preflopRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  preflopCell: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  preflopPos: {
    flex: 1.2,
    fontWeight: '700',
    color: '#fff',
  },
  preflopHeader: {
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  rowHeader: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  sessionTypePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sessionTypePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
  },
  rowMeta: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  chev: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  logButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
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
  handsContainer: {
    paddingBottom: 16,
    paddingLeft: 16,
  },
  handRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  handTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  handMeta: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

// Native styles - original light theme
const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
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
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: '#111',
  },
  chipText: {
    color: '#111',
    fontWeight: '700',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#fff',
  },
  resetChip: {
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f3f3',
  },
  resetChipText: {
    color: '#111',
    fontWeight: '800',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
  },
  statPositive: {
    color: '#22c55e',
  },
  statNegative: {
    color: '#ef4444',
  },
  opponentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  opponentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  opponentStats: {
    fontSize: 13,
    color: '#666',
  },
  muted: {
    color: '#777',
    fontSize: 12,
    marginTop: 6,
  },
  preflopRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  preflopCell: {
    flex: 1,
    fontSize: 12,
    color: '#222',
  },
  preflopPos: {
    flex: 1.2,
    fontWeight: '700',
  },
  preflopHeader: {
    fontWeight: '800',
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  rowHeader: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sessionTypePill: {
    backgroundColor: '#f0f0f0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sessionTypePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
  },
  rowMeta: {
    fontSize: 12,
    color: '#777',
  },
  chev: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
  },
  logButton: {
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  logButtonText: {
    color: '#111',
    fontWeight: '800',
    fontSize: 12,
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
  handsContainer: {
    paddingBottom: 10,
    paddingLeft: 10,
  },
  handRow: {
    paddingVertical: 8,
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
  secondaryButton: {
    marginTop: 10,
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
});
