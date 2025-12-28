import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useClubStore } from '../../store/clubStore';
import { useHistoryStore } from '../../store/historyStore';
import { DepthBucket, PreflopPositionStats, useStatsStore } from '../../store/statsStore';
import { PokerVariant } from '../../../shared/types/game.types';

export default function ProfileScreen() {
  const router = useRouter();
  const { token, player } = useAuthStore();
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

  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  const [rangePreset, setRangePreset] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [clubIdx, setClubIdx] = useState<number>(-1); // -1 = all
  const [variant, setVariant] = useState<PokerVariant | 'all'>('all');
  const [depthBucket, setDepthBucket] = useState<DepthBucket | 'all'>('all');
  const [gameIdx, setGameIdx] = useState<number>(-1); // -1 = all

  useEffect(() => {
    if (!token) return;
    void history.fetchMyHistory(token);
    void fetchMyClubs(token);
  }, [token, history.fetchMyHistory, fetchMyClubs]);

  // Keep indices valid when lists change.
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
    // Important: do NOT depend on `gamesInRange` here, otherwise fetching stats updates gamesInRange which can
    // retrigger this effect and keep the UI stuck in a loading/disabled loop.
  }, [token, player, rangePreset, clubIdx, clubs, gameIdx, variant, depthBucket, fetchMyStats]);

  const sessions = history.profileSessions;

  const title = useMemo(() => {
    if (!player) return 'Player Profile';
    return `Profile: ${player.name}`;
  }, [player]);

  const preflopRows = useMemo(() => preflop?.byPosition || [], [preflop]);

  function pct(n: number, d: number): string {
    if (!d) return '—';
    return `${Math.round((n / d) * 100)}%`;
  }

  function renderPreflopRow(r: PreflopPositionStats) {
    return (
      <View key={r.position} style={styles.preflopRow}>
        <Text style={[styles.preflopCell, styles.preflopPos]}>{r.position}</Text>
        <Text style={styles.preflopCell}>{pct(r.openRaiseCount, r.openOpps)}</Text>
        <Text style={styles.preflopCell}>{pct(r.pfrCount, r.hands)}</Text>
        <Text style={styles.preflopCell}>{pct(r.threeBetCount, r.threeBetOpps)}</Text>
        <Text style={styles.preflopCell}>{pct(r.fourBetCount, r.fourBetOpps)}</Text>
      </View>
    );
  }

  if (!token || !player) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <Text style={styles.title}>Player Profile</Text>
        <Text style={styles.subtitle}>Please log in first.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Game history (including club + non-club)</Text>

      {history.profileError ? <Text style={styles.error}>{history.profileError}</Text> : null}

      <View style={[styles.card, { marginBottom: 12 }]}>
        <Text style={styles.sectionTitle}>Stats (finished hands)</Text>
        {statsError ? <Text style={styles.error}>{statsError}</Text> : null}

        <View style={styles.filtersRow}>
          {(['7d', '30d', '90d', 'all'] as const).map((p) => (
            <Pressable
              key={p}
              style={[styles.chip, rangePreset === p ? styles.chipActive : null]}
              onPress={() => setRangePreset(p)}
            >
              <Text style={[styles.chipText, rangePreset === p ? styles.chipTextActive : null]}>
                {p === 'all' ? 'All time' : p}
              </Text>
            </Pressable>
          ))}

          <Pressable
            style={styles.resetChip}
            onPress={() => {
              setRangePreset('all');
              setClubIdx(-1);
              setVariant('all');
              setDepthBucket('all');
              setGameIdx(-1);
            }}
          >
            <Text style={styles.resetChipText}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.filtersRow}>
          <Pressable
            style={styles.chip}
            onPress={() => setClubIdx((prev) => (clubs.length ? ((prev + 2) % (clubs.length + 1)) - 1 : -1))}
          >
            <Text style={styles.chipText}>Club: {clubIdx >= 0 ? clubs[clubIdx]?.name || '—' : 'All'}</Text>
          </Pressable>

          <Pressable
            style={styles.chip}
            onPress={() => {
              const order: Array<PokerVariant | 'all'> = ['all', 'texas-holdem', 'omaha', 'omaha-hi-lo'];
              const idx = order.indexOf(variant);
              setVariant(order[(idx + 1) % order.length]);
            }}
          >
            <Text style={styles.chipText}>Variant: {variant}</Text>
          </Pressable>

          <Pressable
            style={styles.chip}
            onPress={() => {
              const order: Array<DepthBucket | 'all'> = ['all', '0-50', '50-100', '100-150', '150-500', '500+'];
              const idx = order.indexOf(depthBucket);
              setDepthBucket(order[(idx + 1) % order.length]);
            }}
          >
            <Text style={styles.chipText}>Depth: {depthBucket}</Text>
          </Pressable>

          <Pressable
            style={styles.chip}
            onPress={() =>
              setGameIdx((prev) => (gamesInRange.length ? ((prev + 2) % (gamesInRange.length + 1)) - 1 : -1))
            }
          >
            <Text style={styles.chipText}>Game: {gameIdx >= 0 ? gamesInRange[gameIdx]?.code || '—' : 'All'}</Text>
          </Pressable>
        </View>

        {summary ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.statLine}>
              Hands: {summary.totalHands} • Won: {summary.handsWon} • Win%: {summary.winPercentage.toFixed(1)}
            </Text>
            <Text style={styles.statLine}>
              Net: {summary.totalWinnings} chips • bb/100: {summary.bb100 === null ? '—' : summary.bb100.toFixed(1)}
            </Text>
            <Text style={styles.statLine}>
              VPIP: {summary.vpip.toFixed(1)} • PFR: {summary.pfr.toFixed(1)} • 3bet: {summary.threeBetPercentage.toFixed(1)}
            </Text>
            <Text style={styles.statLine}>
              WTSD: {summary.wtsd.toFixed(1)} • W$SD: {summary.wsd.toFixed(1)} • AF: {summary.aggressionFactor.toFixed(2)} • Cbet: {summary.cbetPercentage.toFixed(1)}
            </Text>
            <Text style={[styles.subtitle, { marginTop: 6, marginBottom: 0, fontSize: 12 }]}>
              {statsLoading ? 'Refreshing…' : 'Filters apply to finished hands only.'}
            </Text>

            {vsOpponents.length ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.sectionTitle}>Vs players (hands together)</Text>
                {vsOpponents.slice(0, 5).map((o) => (
                  <Text key={o.opponentId} style={styles.statLine}>
                    {o.opponentId} • hands {o.handsTogether} • net {o.totalWinnings} • bb/100{' '}
                    {o.bb100 === null ? '—' : o.bb100.toFixed(1)} • WSD(vs) {o.wsdVsOpponent.toFixed(1)}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={{ marginTop: 10 }}>
              <Text style={styles.sectionTitle}>Preflop charts (by position)</Text>
              <View style={styles.preflopRow}>
                <Text style={[styles.preflopCell, styles.preflopHeader, styles.preflopPos]}>Pos</Text>
                <Text style={[styles.preflopCell, styles.preflopHeader]}>RFI</Text>
                <Text style={[styles.preflopCell, styles.preflopHeader]}>PFR</Text>
                <Text style={[styles.preflopCell, styles.preflopHeader]}>3B</Text>
                <Text style={[styles.preflopCell, styles.preflopHeader]}>4B</Text>
              </View>
              {preflopRows.length ? (
                preflopRows.map(renderPreflopRow)
              ) : (
                <Text style={styles.muted}>No positional preflop data yet (needs newer hands).</Text>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.subtitle}>{statsLoading ? 'Loading…' : 'No stats yet. Finish a hand first.'}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your sessions</Text>
        {sessions.length === 0 ? (
          <Text style={styles.subtitle}>No history yet. Join a table and finish a hand.</Text>
        ) : (
          sessions.map((s) => {
            const expanded = !!expandedSessionIds[s.sessionId];
            const joined = new Date(s.joinedAt).toLocaleString();
            const left = s.leftAt ? new Date(s.leftAt).toLocaleString() : 'still seated';
            const label = s.clubId ? 'club game' : 'non-club game';
            return (
              <View key={s.sessionId} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() =>
                      setExpandedSessionIds((prev) => ({ ...prev, [s.sessionId]: !prev[s.sessionId] }))
                    }
                  >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {s.code} • {label}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {joined} → {left} • hands: {s.handsCount}
                    </Text>
                  </View>
                  </Pressable>

                  <Pressable
                    style={styles.logButton}
                    onPress={() => router.push(`/history/game/${s.gameId}?sessionId=${s.sessionId}`)}
                  >
                    <Text style={styles.logButtonText}>Log</Text>
                  </Pressable>

                  <Text style={styles.chev}>{expanded ? 'Hide' : 'Show'}</Text>
                </View>

                {expanded ? (
                  <View style={styles.handsContainer}>
                    {s.hands.length === 0 ? (
                      <Text style={styles.subtitle}>No finished hands in this session yet.</Text>
                    ) : (
                      s.hands.map((h) => {
                        const ended = new Date(h.endedAt).toLocaleString();
                        const winners = h.winners.map((w) => `${w.playerId}:${w.amount}`).join(', ');
                        return (
                          <View key={`${s.sessionId}:${h.handNumber}`} style={styles.handRow}>
                            <Text style={styles.handTitle}>
                              Hand #{h.handNumber} • {h.reason} • pot {h.pot}
                            </Text>
                            <Text style={styles.handMeta}>
                              ended: {ended} • winners: {winners || '—'} • actions: {h.actions.length}
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

        <Pressable style={styles.secondaryButton} onPress={() => void history.fetchMyHistory(token)}>
          <Text style={styles.secondaryButtonText}>{history.profileLoading ? 'Refreshing…' : 'Refresh'}</Text>
        </Pressable>
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
    flex: 1,
    backgroundColor: '#fff',
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
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
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
  statLine: {
    fontSize: 13,
    color: '#222',
    marginBottom: 4,
    fontWeight: '600',
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
});

