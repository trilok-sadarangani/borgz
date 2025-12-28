import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { getAuth0Config } from '../services/runtimeConfig';
import { explainAuth0Failure, validateAuth0Config } from '../../shared/auth0Diagnostics';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { token, player, seedPlayers, loading, error, fetchSeedPlayers, login, loginWithAuth0AccessToken, clearError } =
    useAuthStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [password, setPassword] = useState('borgz');
  const [auth0Error, setAuth0Error] = useState<string | null>(null);

  const { domain: auth0Domain, clientId: auth0ClientId, audience: auth0Audience } = getAuth0Config();

  const discovery = AuthSession.useAutoDiscovery(auth0Domain ? `https://${auth0Domain}` : '');
  const redirectUri = useMemo(() => {
    // On web, always use the actual origin (includes the real port, e.g. :8082).
    // This prevents Auth0 "Callback URL mismatch" when Expo picks a different dev port.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isWeb = typeof (globalThis as any)?.document !== 'undefined';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origin = (globalThis as any)?.location?.origin as string | undefined;
    if (isWeb && origin) return origin;
    return AuthSession.makeRedirectUri({ scheme: 'borgz' });
  }, []);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: auth0ClientId || '',
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      scopes: ['openid', 'profile', 'email'],
      extraParams: auth0Audience ? { audience: auth0Audience } : undefined,
    },
    discovery
  );

  useEffect(() => {
    void fetchSeedPlayers();
  }, [fetchSeedPlayers]);

  useEffect(() => {
    if (token && player) {
      router.replace('/(tabs)');
    }
  }, [token, player, router]);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const accessToken = (response.params as any)?.access_token as string | undefined;
    if (!accessToken) return;
    void loginWithAuth0AccessToken(accessToken);
  }, [response, loginWithAuth0AccessToken]);

  useEffect(() => {
    const msg = explainAuth0Failure(response as any, { domain: auth0Domain, clientId: auth0ClientId, audience: auth0Audience }, { redirectUri });
    if (msg) setAuth0Error(msg);
  }, [response, auth0Domain, auth0ClientId, auth0Audience, redirectUri]);

  useEffect(() => {
    if (!selectedId && seedPlayers.length) {
      setSelectedId(seedPlayers[0].id);
    }
  }, [seedPlayers, selectedId]);

  const selected = useMemo(
    () => seedPlayers.find((p) => p.id === selectedId) || null,
    [seedPlayers, selectedId]
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Sign in with Auth0 (recommended) or use seed login (dev).</Text>

      {error ? (
        <Pressable onPress={clearError}>
          <Text style={styles.error}>{error} (tap to clear)</Text>
        </Pressable>
      ) : null}

      {auth0Error ? (
        <Pressable onPress={() => setAuth0Error(null)}>
          <Text style={styles.error}>{auth0Error} (tap to clear)</Text>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Auth0</Text>
        <Pressable
          style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
          disabled={loading || !request || !discovery || !auth0Domain || !auth0ClientId}
          onPress={() => {
            setAuth0Error(null);
            void promptAsync();
          }}
        >
          <Text style={styles.primaryButtonText}>
            {auth0Domain && auth0ClientId ? 'Continue with Auth0' : 'Set Auth0 env vars to enable'}
          </Text>
        </Pressable>

        <Text style={[styles.metaText, { marginTop: 8 }]}>
          Redirect URI: {redirectUri}
        </Text>

        {validateAuth0Config(
          { domain: auth0Domain, clientId: auth0ClientId, audience: auth0Audience },
          { redirectUri }
        ).map((issue, idx) => (
          <Text key={idx} style={styles.metaText}>
            {issue}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Seed player</Text>
        <View style={styles.playerList}>
          {seedPlayers.map((p) => {
            const active = p.id === selectedId;
            return (
              <Pressable
                key={p.id}
                onPress={() => setSelectedId(p.id)}
                style={[styles.playerChip, active ? styles.playerChipActive : null]}
                disabled={loading}
              >
                <Text style={[styles.playerChipText, active ? styles.playerChipTextActive : null]}>
                  {p.avatar ? `${p.avatar} ` : ''}
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Seed password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Seed password"
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        <Pressable
          style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
          disabled={loading || !selectedId || !password}
          onPress={() => {
            if (!selectedId) return;
            void login(selectedId, password);
          }}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Logging in…' : 'Login'}</Text>
        </Pressable>

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {selected ? `Selected: ${selected.name} (${selected.id})` : 'Loading players…'}
          </Text>
          <Text style={styles.metaText}>Default seed password: borgz</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16, textAlign: 'center' },
  error: { color: '#b00020', marginBottom: 12, textAlign: 'center' },
  card: {
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 8 },
  playerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  playerChip: {
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  playerChipActive: { backgroundColor: '#111' },
  playerChipText: { color: '#111', fontWeight: '700' },
  playerChipTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  meta: { marginTop: 12, gap: 4 },
  metaText: { fontSize: 12, color: '#666' },
});

