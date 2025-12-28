import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useClubStore } from '../../store/clubStore';
import { useClubGameStore } from '../../store/clubGameStore';
import { LoadingScreen } from '../../components/LoadingScreen';

export default function ClubsScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const player = useAuthStore((s) => s.player);
  const clubs = useClubStore((s) => s.clubs);
  const loading = useClubStore((s) => s.loading);
  const error = useClubStore((s) => s.error);
  const fetchMyClubs = useClubStore((s) => s.fetchMyClubs);
  const createClub = useClubStore((s) => s.createClub);
  const joinClub = useClubStore((s) => s.joinClub);

  const gamesByClubId = useClubGameStore((s) => s.gamesByClubId);
  const fetchClubGames = useClubGameStore((s) => s.fetchClubGames);

  const [clubName, setClubName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const normalizedInviteCode = useMemo(() => inviteCode.trim().toUpperCase(), [inviteCode]);
  const trimmedClubName = useMemo(() => clubName.trim(), [clubName]);
  const livePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clubsRef = useRef(clubs);

  useEffect(() => {
    clubsRef.current = clubs;
  }, [clubs]);

  useEffect(() => {
    if (!token) return;
    void fetchMyClubs(token);
  }, [token, fetchMyClubs]);

  const refreshLive = useCallback(async () => {
    if (!token) return;
    const currentClubs = clubsRef.current || [];
    if (currentClubs.length === 0) return;
    // Fetch per-club active games so we can show a lightweight "LIVE" preview.
    // This is intentionally best-effort; failures should not block the clubs UI.
    await Promise.allSettled(currentClubs.map((c) => fetchClubGames(token, c.id)));
  }, [token, fetchClubGames]);

  // Refresh whenever the tab is focused (keeps list in sync after creating/joining elsewhere).
  useFocusEffect(
    useCallback(() => {
      if (!token) return () => undefined;
      void fetchMyClubs(token);

      // Start polling while focused so "live" previews stay fresh.
      void refreshLive();
      if (livePollRef.current) clearInterval(livePollRef.current);
      livePollRef.current = setInterval(() => void refreshLive(), 6000);

      return () => {
        if (livePollRef.current) clearInterval(livePollRef.current);
        livePollRef.current = null;
      };
    }, [token, fetchMyClubs, refreshLive])
  );

  // Ensure the interval is cleaned up when we leave this screen.
  useEffect(() => {
    return () => {
      if (livePollRef.current) clearInterval(livePollRef.current);
    };
  }, []);

  if (!token || !player) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <Text style={styles.title}>Clubs</Text>
        <Text style={styles.subtitle}>Please log in first.</Text>
      </View>
    );
  }

  if (loading && clubs.length === 0) {
    return <LoadingScreen backgroundColor="#fff" />;
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clubs</Text>
        <Text style={styles.subtitle}>Create or join. See what’s live.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.twoCol}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create club</Text>
          <TextInput
            value={clubName}
            onChangeText={setClubName}
            placeholder="Name"
            autoCorrect={false}
            spellCheck={false}
            style={styles.input}
          />
          <Pressable
            style={[styles.primaryButton, !trimmedClubName ? styles.buttonDisabled : null]}
            disabled={loading || !trimmedClubName}
            onPress={async () => {
              const created = await createClub(token, trimmedClubName);
              if (created) setClubName('');
            }}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Creating…' : 'Create'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Join club</Text>
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="Code"
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            style={styles.input}
          />
          <Pressable
            style={[styles.primaryButton, !normalizedInviteCode ? styles.buttonDisabled : null]}
            disabled={loading || !normalizedInviteCode}
            onPress={async () => {
              const joined = await joinClub(token, normalizedInviteCode);
              if (joined) setInviteCode('');
            }}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Joining…' : 'Join'}</Text>
          </Pressable>
          <Text style={styles.helperText}>Tip: codes are 6–8 chars (A–Z, 0–9).</Text>
        </View>
      </View>

      <View style={[styles.card, { marginTop: 2 }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your clubs</Text>
          <Pressable style={styles.ghostButton} onPress={() => void fetchMyClubs(token)} disabled={loading}>
            <Text style={styles.ghostButtonText}>{loading ? 'Refreshing…' : 'Refresh'}</Text>
          </Pressable>
        </View>

        {clubs.length === 0 ? (
          <Text style={styles.emptyText}>You’re not in any clubs yet.</Text>
        ) : (
          clubs.map((c, idx) => {
            const liveGames = gamesByClubId[c.id] || [];
            const live = liveGames.length > 0;
            const preview = liveGames[0];
            return (
              <Pressable
                key={c.id}
                style={[styles.clubRow, live ? styles.clubRowLive : null, idx === 0 ? styles.clubRowFirst : null]}
                onPress={() => router.push(`/club/${c.id}`)}
                disabled={loading}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.clubTitleRow}>
                    <Text style={styles.clubName}>{c.name}</Text>
                    {live ? (
                      <View style={styles.livePill}>
                        <Text style={styles.livePillText}>LIVE</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.clubMeta}>
                    {c.memberIds?.length ?? 0} members
                    {c.inviteCode ? `  •  code ${c.inviteCode}` : ''}
                  </Text>

                  {live && preview ? (
                    <Text style={styles.livePreview}>
                      Game {preview.code} • {preview.phase} • {preview.playerCount} players
                      {liveGames.length > 1 ? `  •  +${liveGames.length - 1} more` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.livePreviewMuted}>No live game right now.</Text>
                  )}
                </View>

                <Text style={styles.chevron}>›</Text>
              </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    width: '100%',
    maxWidth: 560,
    marginBottom: 10,
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
});


