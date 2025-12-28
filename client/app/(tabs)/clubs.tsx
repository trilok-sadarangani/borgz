import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useClubStore } from '../../store/clubStore';

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

  const [clubName, setClubName] = useState('');
  const [clubDescription, setClubDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const normalizedInviteCode = useMemo(() => inviteCode.trim().toUpperCase(), [inviteCode]);

  useEffect(() => {
    if (!token) return;
    void fetchMyClubs(token);
  }, [token, fetchMyClubs]);

  // Refresh whenever the tab is focused (keeps list in sync after creating/joining elsewhere).
  useFocusEffect(
    useCallback(() => {
      if (!token) return () => undefined;
      void fetchMyClubs(token);
      return () => undefined;
    }, [token, fetchMyClubs])
  );

  if (!token || !player) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <Text style={styles.title}>Clubs</Text>
        <Text style={styles.subtitle}>Please log in first.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Clubs</Text>
      <Text style={styles.subtitle}>Create a club or join with a code</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your clubs</Text>
        {clubs.length === 0 ? (
          <Text style={styles.subtitle}>You’re not in any clubs yet.</Text>
        ) : (
          clubs.map((c) => (
            <View key={c.id} style={styles.clubRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.clubName}>{c.name}</Text>
                {c.description ? <Text style={styles.clubDesc}>{c.description}</Text> : null}
                <Text style={styles.clubMeta}>
                  members: {c.memberIds?.length ?? 0}
                  {c.inviteCode ? `  •  code: ${c.inviteCode}` : ''}
                </Text>
              </View>
              <Pressable
                style={styles.enterButton}
                onPress={() => router.push(`/club/${c.id}`)}
                disabled={loading}
              >
                <Text style={styles.enterButtonText}>Enter</Text>
              </Pressable>
            </View>
          ))
        )}
        <Pressable
          style={styles.secondaryButton}
          onPress={() => void fetchMyClubs(token)}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create club</Text>
        <TextInput
          value={clubName}
          onChangeText={setClubName}
          placeholder="Club name"
          style={styles.input}
        />
        <TextInput
          value={clubDescription}
          onChangeText={setClubDescription}
          placeholder="Description (optional)"
          style={styles.input}
        />
        <Pressable
          style={styles.primaryButton}
          disabled={loading}
          onPress={async () => {
            const name = clubName.trim();
            const desc = clubDescription.trim();
            const created = await createClub(token, name, desc || undefined);
            if (created) {
              setClubName('');
              setClubDescription('');
            }
          }}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Creating…' : 'Create'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Join club</Text>
        <TextInput
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Enter club code (e.g. ABC12345)"
          autoCapitalize="characters"
          style={styles.input}
        />
        <Pressable
          style={styles.primaryButton}
          disabled={loading}
          onPress={async () => {
            const joined = await joinClub(token, normalizedInviteCode);
            if (joined) setInviteCode('');
          }}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Joining…' : 'Join'}</Text>
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
  clubRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  clubDesc: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
  clubMeta: {
    fontSize: 12,
    color: '#777',
  },
  enterButton: {
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});


