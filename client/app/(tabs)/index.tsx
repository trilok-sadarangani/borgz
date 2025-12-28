import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { GameSettingsForm } from '../../components/GameSettingsForm';
import { GameSettings } from '../../../shared/types/game.types';

export default function LobbyScreen() {
  const router = useRouter();
  const { player, logout } = useAuthStore();
  const gameStore = useGameStore();
  const [code, setCode] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState<Partial<GameSettings>>({});

  const normalizedCode = useMemo(() => code.trim().toUpperCase(), [code]);

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
          onPress={async () => {
            await gameStore.joinGame(normalizedCode, player.id, player.name);
            // If join succeeded, take the user to the table immediately.
            if (!useGameStore.getState().error) router.push('/(tabs)/game');
          }}
        >
          <Text style={styles.primaryButtonText}>Join</Text>
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
              await gameStore.joinGame(newCode, player.id, player.name);
              if (!useGameStore.getState().error) router.push('/(tabs)/game');
            } catch (e) {
              // createGame throws on failure; surface it via the existing error UI.
              const msg = e instanceof Error ? e.message : 'Failed to create game';
              useGameStore.setState({ error: msg });
            }
          }}
        >
          <Text style={styles.primaryButtonText}>Create & Join</Text>
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

