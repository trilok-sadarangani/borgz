import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';

export default function GameScreen() {
  const { game, gameCode, act, startGame, nextHand, endGame, rebuy, leaveGame, error, clearError } = useGameStore();
  const { player } = useAuthStore();
  const [raiseAmount, setRaiseAmount] = useState('100');
  const [rebuyAmount, setRebuyAmount] = useState('1000');

  const me = useMemo(
    () => (player ? game?.players.find((p) => p.id === player.id) || null : null),
    [game, player]
  );
  const isMyTurn = useMemo(() => {
    if (!game || !me) return false;
    return game.players[game.activePlayerIndex]?.id === me.id;
  }, [game, me]);
  const isHost = useMemo(() => !!(game && player && game.hostPlayerId === player.id), [game, player]);

  const positionLabel = useMemo(() => {
    if (!game) return (_idx: number) => '';

    const n = game.players.length;
    return (idx: number) => {
      if (n < 2) return '';

      // Heads-up: dealer is also the small blind (button).
      if (n === 2) {
        if (idx === game.smallBlindPosition) return '(BTN/SB)';
        if (idx === game.bigBlindPosition) return '(BB)';
        return '';
      }

      if (idx === game.dealerPosition) return '(BTN)';
      if (idx === game.smallBlindPosition) return '(SB)';
      if (idx === game.bigBlindPosition) return '(BB)';

      const afterBBCount = n - 3; // seats after BB, up to BTN
      const labelsByCount: Record<number, string[]> = {
        1: ['UTG'],
        2: ['UTG', 'CO'],
        3: ['UTG', 'MP', 'CO'],
        4: ['UTG', 'MP', 'HJ', 'CO'],
        5: ['UTG', 'UTG+1', 'MP', 'HJ', 'CO'],
        6: ['UTG', 'UTG+1', 'MP', 'MP+1', 'HJ', 'CO'],
      };
      const labels =
        labelsByCount[afterBBCount] ||
        Array.from({ length: afterBBCount }, (_v, i) => `POS+${i + 1}`);

      const firstAfterBB = (game.bigBlindPosition + 1) % n;
      let cursor = firstAfterBB;
      for (let k = 0; k < afterBBCount; k++) {
        if (cursor === idx) return `(${labels[k]})`;
        cursor = (cursor + 1) % n;
      }

      return '';
    };
  }, [game]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Table</Text>

      {error ? (
        <Pressable onPress={clearError}>
          <Text style={styles.error}>{error} (tap to clear)</Text>
        </Pressable>
      ) : null}

      {!player ? (
        <Text style={styles.subtitle}>Please log in first.</Text>
      ) : !game || !gameCode ? (
        <Text style={styles.subtitle}>Join a game from the Lobby tab.</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Code: {gameCode}</Text>
          <Text style={styles.subtitle}>Phase: {game.phase}</Text>
          <Text style={styles.subtitle}>Pot: {game.pot}</Text>
          <Text style={styles.subtitle}>Current bet: {game.currentBet}</Text>

          <Text style={styles.sectionTitle}>Game Settings</Text>
          <Text style={styles.subtitle}>
            Blinds: {game.settings.smallBlind}/{game.settings.bigBlind} | Stack: {game.settings.startingStack} | Max: {game.settings.maxPlayers}
          </Text>
          {game.settings.stackRange ? (
            <Text style={styles.subtitle}>
              Stack range: {game.settings.stackRange.min}–{game.settings.stackRange.max}
            </Text>
          ) : null}
          {game.settings.turnTimerSeconds ? (
            <Text style={styles.subtitle}>Turn timer: {game.settings.turnTimerSeconds}s</Text>
          ) : null}
          {game.settings.timeBankConfig ? (
            <Text style={styles.subtitle}>
              Time bank: {game.settings.timeBankConfig.banks}×{game.settings.timeBankConfig.secondsPerBank}s
            </Text>
          ) : null}
          {game.settings.ante && game.settings.ante.type !== 'none' ? (
            <Text style={styles.subtitle}>
              Ante: {game.settings.ante.type} {game.settings.ante.amount}
            </Text>
          ) : null}
          {game.settings.gameLengthMinutes ? (
            <Text style={styles.subtitle}>Game length: {game.settings.gameLengthMinutes} min</Text>
          ) : null}

          <Text style={styles.sectionTitle}>Players</Text>
          {game.players.map((p, idx) => (
            <Text key={p.id} style={styles.playerLine}>
              {idx === game.activePlayerIndex ? '▶ ' : '  '}
              {p.name} {positionLabel(idx)} — stack {p.stack}{' '}
              {p.hasFolded ? '(folded)' : ''} {p.isAllIn ? '(all-in)' : ''}{' '}
              {p.id === player.id ? '(you)' : ''}
              {game.hostPlayerId === p.id ? ' (host)' : ''}
            </Text>
          ))}

          <View style={styles.row}>
            <Pressable style={styles.secondaryButton} onPress={() => leaveGame()}>
              <Text style={styles.secondaryButtonText}>Leave</Text>
            </Pressable>

            <Pressable
              style={[styles.primaryButton, !isHost ? { opacity: 0.5 } : null]}
              disabled={!isHost}
              onPress={() => startGame(gameCode, player.id)}
            >
              <Text style={styles.primaryButtonText}>{isHost ? 'Start' : 'Host only'}</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <Pressable
              style={[styles.dangerButton, !isHost ? { opacity: 0.5 } : null]}
              disabled={!isHost}
              onPress={() => endGame()}
            >
              <Text style={styles.dangerButtonText}>{isHost ? 'End game' : 'Host only'}</Text>
            </Pressable>
          </View>

          {game.phase === 'finished' && game.lastHandResult ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionTitle}>Winner</Text>
              <Text style={styles.subtitle}>
                {game.lastHandResult.winners
                  .map((w) => `${w.playerId} +${w.amount}`)
                  .join(', ')}{' '}
                — pot {game.lastHandResult.pot} ({game.lastHandResult.reason})
              </Text>
              <Pressable
                style={[styles.primaryButton, { marginTop: 10 }, !isHost ? { opacity: 0.5 } : null]}
                disabled={!isHost}
                onPress={() => nextHand(gameCode, player.id)}
              >
                <Text style={styles.primaryButtonText}>{isHost ? 'Next hand' : 'Host only'}</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Actions {isMyTurn ? '(your turn)' : ''}</Text>
          <View style={styles.rowWrap}>
            <Pressable style={styles.actionButton} onPress={() => act('fold')}>
              <Text style={styles.actionButtonText}>Fold</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => act('check')}>
              <Text style={styles.actionButtonText}>Check</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => act('call')}>
              <Text style={styles.actionButtonText}>Call</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => act('all-in')}>
              <Text style={styles.actionButtonText}>All-in</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <TextInput
              value={raiseAmount}
              onChangeText={setRaiseAmount}
              placeholder="Raise to"
              keyboardType="numeric"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              style={[styles.input, { flex: 1 }]}
            />
            <Pressable
              style={[styles.actionButton, { paddingHorizontal: 16 }]}
              onPress={() => {
                Keyboard.dismiss();
                const amt = Number(raiseAmount);
                if (!Number.isFinite(amt)) return;
                act('raise', amt);
              }}
            >
              <Text style={styles.actionButtonText}>Raise</Text>
            </Pressable>
          </View>

          {me && me.stack === 0 ? (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.sectionTitle}>Rebuy</Text>
              <Text style={styles.subtitle}>You’re at 0. Add chips to keep playing next hands.</Text>
              <View style={styles.row}>
                <TextInput
                  value={rebuyAmount}
                  onChangeText={setRebuyAmount}
                  placeholder="Rebuy amount"
                  keyboardType="numeric"
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                  style={[styles.input, { flex: 1 }]}
                />
                <Pressable
                  style={[styles.primaryButton, { paddingHorizontal: 16 }]}
                  onPress={() => {
                    Keyboard.dismiss();
                    const amt = Number(rebuyAmount);
                    if (!Number.isFinite(amt) || amt <= 0) return;
                    rebuy(amt);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Add</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Your cards</Text>
          <Text style={styles.subtitle}>
            {me?.cards?.length ? me.cards.map((c) => `${c.rank}${c.suit[0].toUpperCase()}`).join(' ') : 'Hidden'}
          </Text>

          <Text style={styles.sectionTitle}>Board</Text>
          <Text style={styles.subtitle}>
            {game.communityCards.length
              ? game.communityCards.map((c) => `${c.rank}${c.suit[0].toUpperCase()}`).join(' ')
              : '(none)'}
          </Text>

          <Text style={styles.sectionTitle}>History</Text>
          {game.history.length ? (
            <View>
              {game.history
                .slice(-12)
                .reverse()
                .map((h) => (
                  <Text key={`${h.timestamp}-${h.playerId}`} style={styles.subtitle}>
                    {new Date(h.timestamp).toLocaleTimeString()} — {h.playerId}: {h.action}
                    {h.amount !== undefined ? ` ${h.amount}` : ''}
                  </Text>
                ))}
            </View>
          ) : (
            <Text style={styles.subtitle}>(no actions yet)</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  playerLine: {
    fontSize: 14,
    color: '#222',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#111',
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#222',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: '#b00020',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

