import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useClubStore } from '../../store/clubStore';
import { useClubGameStore } from '../../store/clubGameStore';
import { LoadingScreen } from '../../components/LoadingScreen';

const isWeb = Platform.OS === 'web';

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
    await Promise.allSettled(currentClubs.map((c) => fetchClubGames(token, c.id)));
  }, [token, fetchClubGames]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return () => undefined;
      void fetchMyClubs(token);
      void refreshLive();
      if (livePollRef.current) clearInterval(livePollRef.current);
      livePollRef.current = setInterval(() => void refreshLive(), 6000);

      return () => {
        if (livePollRef.current) clearInterval(livePollRef.current);
        livePollRef.current = null;
      };
    }, [token, fetchMyClubs, refreshLive])
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
      <View style={[s.container, { flex: 1 }]}>
        <Text style={s.subtitle}>Loading...</Text>
      </View>
    ) : (
      <LoadingScreen backgroundColor="#fff" />
    );
  }

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
                onPress={() => router.push(`/club/${c.id}`)}
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
    maxWidth: 640,
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
  },
  twoCol: {
    width: '100%',
    maxWidth: 640,
    flexDirection: 'row',
    gap: 24,
  },
  card: {
    flex: 1,
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
