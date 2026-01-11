import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Keyboard,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { PlayingCard, CardSuit } from '../../components/PlayingCard';
import { GameChat } from '../../components/GameChat';

const isWeb = Platform.OS === 'web';

// Seat positions around an oval table (percentages from center)
// Arranged for up to 10 players like Poker Now
const SEAT_POSITIONS = [
  { x: 0, y: 45 }, // bottom center (seat 1)
  { x: -35, y: 38 }, // bottom left (seat 2)
  { x: -48, y: 15 }, // left upper (seat 3)
  { x: -48, y: -15 }, // left lower (seat 4)
  { x: -35, y: -38 }, // top left (seat 5)
  { x: 0, y: -45 }, // top center (seat 6)
  { x: 35, y: -38 }, // top right (seat 7)
  { x: 48, y: -15 }, // right upper (seat 8)
  { x: 48, y: 15 }, // right lower (seat 9)
  { x: 35, y: 38 }, // bottom right (seat 10)
];

function suitFromChar(s: string): CardSuit {
  const lower = s.toLowerCase();
  if (lower === 's' || lower === 'spades') return 'spades';
  if (lower === 'h' || lower === 'hearts') return 'hearts';
  if (lower === 'c' || lower === 'clubs') return 'clubs';
  return 'diamonds';
}

export default function GameScreen() {
  const { game, gameCode, act, startGame, nextHand, endGame, rebuy, leaveGame, error, clearError } =
    useGameStore();
  const { player } = useAuthStore();
  const [raiseAmount, setRaiseAmount] = useState('100');
  const [rebuyAmount, setRebuyAmount] = useState('1000');
  const [showHistory, setShowHistory] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Calculate table dimensions based on screen size
  const tableWidth = Math.min(windowWidth * 0.9, 800);
  const tableHeight = Math.min(windowHeight * 0.45, 400);

  const me = useMemo(
    () => (player ? game?.players.find((p) => p.id === player.id) || null : null),
    [game, player]
  );
  const isMyTurn = useMemo(() => {
    if (!game || !me) return false;
    return game.players[game.activePlayerIndex]?.id === me.id;
  }, [game, me]);
  const isHost = useMemo(
    () => !!(game && player && game.hostPlayerId === player.id),
    [game, player]
  );

  const positionLabel = useMemo(() => {
    if (!game) return (_idx: number) => '';

    const n = game.players.length;
    return (idx: number) => {
      if (n < 2) return '';

      if (n === 2) {
        if (idx === game.smallBlindPosition) return 'BTN/SB';
        if (idx === game.bigBlindPosition) return 'BB';
        return '';
      }

      if (idx === game.dealerPosition) return 'BTN';
      if (idx === game.smallBlindPosition) return 'SB';
      if (idx === game.bigBlindPosition) return 'BB';

      const afterBBCount = n - 3;
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
        if (cursor === idx) return labels[k];
        cursor = (cursor + 1) % n;
      }

      return '';
    };
  }, [game]);

  // Arrange players in seat positions
  const seatedPlayers = useMemo(() => {
    if (!game) return [];
    const maxSeats = game.settings.maxPlayers || 10;
    const seats: Array<{
      seatIndex: number;
      player: (typeof game.players)[0] | null;
      position: { x: number; y: number };
    }> = [];

    for (let i = 0; i < maxSeats; i++) {
      const seatPos = SEAT_POSITIONS[i % SEAT_POSITIONS.length];
      const playerAtSeat = game.players[i] || null;
      seats.push({
        seatIndex: i,
        player: playerAtSeat,
        position: seatPos,
      });
    }
    return seats;
  }, [game]);

  const styles = isWeb ? webStyles : mobileStyles;

  // Not logged in
  if (!player) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Game Table</Text>
        <Text style={styles.subtitle}>Please log in first.</Text>
      </View>
    );
  }

  // No game joined
  if (!game || !gameCode) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Game Table</Text>
        <Text style={styles.subtitle}>Join a game from the Clubs tab.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.gameCode}>Game {gameCode}</Text>
          <Text style={styles.blindsText}>
            NLH • {game.settings.smallBlind}/{game.settings.bigBlind}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.leaveButton} onPress={() => leaveGame()}>
            <Text style={styles.leaveButtonText}>Leave</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <Pressable onPress={clearError} style={styles.errorContainer}>
          <Text style={styles.error}>{error} (tap to clear)</Text>
        </Pressable>
      ) : null}

      {/* Poker Table */}
      <View style={[styles.tableContainer, { width: tableWidth, height: tableHeight }]}>
        {/* Table felt (oval) */}
        <View style={styles.tableFelt}>
          {/* Pot display */}
          <View style={styles.potContainer}>
            <Text style={styles.potLabel}>POT</Text>
            <Text style={styles.potAmount}>{game.pot}</Text>
          </View>

          {/* Community cards */}
          <View style={styles.communityCards}>
            {game.communityCards.length > 0 ? (
              game.communityCards.map((card, idx) => (
                <PlayingCard
                  key={idx}
                  suit={suitFromChar(card.suit)}
                  value={card.rank}
                  style={styles.communityCard}
                />
              ))
            ) : (
              <Text style={styles.noCardsText}>
                {game.phase === 'waiting' ? 'Waiting to start' : 'No cards yet'}
              </Text>
            )}
          </View>

          {/* Phase indicator */}
          <View style={styles.phaseContainer}>
            <Text style={styles.phaseText}>{game.phase.toUpperCase()}</Text>
          </View>
        </View>

        {/* Player seats around the table */}
        {seatedPlayers.map((seat) => {
          const isActive = seat.player && game.players[game.activePlayerIndex]?.id === seat.player.id;
          const isMe = seat.player?.id === player.id;
          const isHostPlayer = seat.player?.id === game.hostPlayerId;

          // Calculate position
          const left = 50 + seat.position.x;
          const top = 50 + seat.position.y;

          return (
            <View
              key={seat.seatIndex}
              style={[
                styles.seatContainer,
                {
                  left: `${left}%`,
                  top: `${top}%`,
                  transform: [{ translateX: -40 }, { translateY: -30 }],
                },
                isActive ? styles.seatActive : null,
                isMe ? styles.seatMe : null,
              ]}
            >
              {seat.player ? (
                <>
                  <View style={[styles.seatAvatar, isActive ? styles.seatAvatarActive : null]}>
                    <Text style={styles.seatAvatarText}>
                      {seat.player.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.seatName} numberOfLines={1}>
                    {seat.player.name}
                    {isHostPlayer ? ' ★' : ''}
                  </Text>
                  <Text style={styles.seatStack}>{seat.player.stack}</Text>
                  {positionLabel(seat.seatIndex) ? (
                    <View style={styles.positionBadge}>
                      <Text style={styles.positionBadgeText}>{positionLabel(seat.seatIndex)}</Text>
                    </View>
                  ) : null}
                  {seat.player.hasFolded ? (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>FOLD</Text>
                    </View>
                  ) : seat.player.isAllIn ? (
                    <View style={[styles.statusBadge, styles.allInBadge]}>
                      <Text style={styles.statusBadgeText}>ALL-IN</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <View style={styles.emptySeat}>
                    <Text style={styles.emptySeatText}>{seat.seatIndex + 1}</Text>
                  </View>
                  <Text style={styles.emptySeatLabel}>Empty</Text>
                </>
              )}
            </View>
          );
        })}
      </View>

      {/* Your cards section */}
      <View style={styles.myCardsContainer}>
        <Text style={styles.myCardsLabel}>Your Cards</Text>
        <View style={styles.myCards}>
          {me?.cards?.length ? (
            me.cards.map((card, idx) => (
              <PlayingCard
                key={idx}
                suit={suitFromChar(card.suit)}
                value={card.rank}
                style={styles.myCard}
              />
            ))
          ) : (
            <Text style={styles.noCardsText}>Hidden</Text>
          )}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        {isMyTurn ? (
          <View style={styles.turnIndicator}>
            <Text style={styles.turnIndicatorText}>YOUR TURN</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, styles.foldButton]}
            onPress={() => act('fold')}
          >
            <Text style={styles.actionButtonText}>Fold</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.checkButton]}
            onPress={() => act('check')}
          >
            <Text style={styles.actionButtonText}>Check</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.callButton]}
            onPress={() => act('call')}
          >
            <Text style={styles.actionButtonText}>Call</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.allInButton]}
            onPress={() => act('all-in')}
          >
            <Text style={styles.actionButtonText}>All-in</Text>
          </Pressable>
        </View>

        <View style={styles.raiseRow}>
          <TextInput
            value={raiseAmount}
            onChangeText={setRaiseAmount}
            placeholder="Amount"
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="numeric"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
            style={styles.raiseInput}
          />
          <Pressable
            style={[styles.actionButton, styles.raiseButton]}
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
      </View>

      {/* Host controls */}
      {isHost ? (
        <View style={styles.hostControls}>
          <Text style={styles.hostLabel}>Host Controls</Text>
          <View style={styles.hostButtonRow}>
            {game.phase === 'waiting' ? (
              <Pressable
                style={styles.hostButton}
                onPress={() => startGame(gameCode, player.id)}
              >
                <Text style={styles.hostButtonText}>Start Game</Text>
              </Pressable>
            ) : null}
            {game.phase === 'finished' && game.lastHandResult ? (
              <Pressable
                style={styles.hostButton}
                onPress={() => nextHand(gameCode, player.id)}
              >
                <Text style={styles.hostButtonText}>Next Hand</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.endGameButton} onPress={() => endGame()}>
              <Text style={styles.endGameButtonText}>End Game</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Last hand result */}
      {game.phase === 'finished' && game.lastHandResult ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Hand Complete</Text>
          <Text style={styles.resultText}>
            {game.lastHandResult.winners.map((w) => `${w.playerId} won ${w.amount}`).join(', ')}
          </Text>
          <Text style={styles.resultReason}>
            Pot: {game.lastHandResult.pot} • {game.lastHandResult.reason}
          </Text>
        </View>
      ) : null}

      {/* Rebuy section */}
      {me && me.stack === 0 ? (
        <View style={styles.rebuyCard}>
          <Text style={styles.rebuyTitle}>Out of chips!</Text>
          <Text style={styles.rebuyText}>Add chips to continue playing.</Text>
          <View style={styles.rebuyRow}>
            <TextInput
              value={rebuyAmount}
              onChangeText={setRebuyAmount}
              placeholder="Amount"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="numeric"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              style={styles.rebuyInput}
            />
            <Pressable
              style={styles.rebuyButton}
              onPress={() => {
                Keyboard.dismiss();
                const amt = Number(rebuyAmount);
                if (!Number.isFinite(amt) || amt <= 0) return;
                rebuy(amt);
              }}
            >
              <Text style={styles.rebuyButtonText}>Add Chips</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* History toggle */}
      <Pressable style={styles.historyToggle} onPress={() => setShowHistory(!showHistory)}>
        <Text style={styles.historyToggleText}>
          {showHistory ? 'Hide History' : 'Show History'}
        </Text>
      </Pressable>

      {showHistory ? (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Recent Actions</Text>
          {game.history.length ? (
            game.history
              .slice(-10)
              .reverse()
              .map((h, idx) => (
                <Text key={`${h.timestamp}-${h.playerId}-${idx}`} style={styles.historyLine}>
                  {new Date(h.timestamp).toLocaleTimeString()} • {h.playerId}: {h.action}
                  {h.amount !== undefined ? ` ${h.amount}` : ''}
                </Text>
              ))
          ) : (
            <Text style={styles.historyLine}>No actions yet</Text>
          )}
        </View>
      ) : null}

      {/* Game info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Game Settings</Text>
        <Text style={styles.infoText}>
          Blinds: {game.settings.smallBlind}/{game.settings.bigBlind} • Stack:{' '}
          {game.settings.startingStack} • Max: {game.settings.maxPlayers}
        </Text>
        {game.settings.turnTimerSeconds ? (
          <Text style={styles.infoText}>Turn timer: {game.settings.turnTimerSeconds}s</Text>
        ) : null}
        {game.settings.ante && game.settings.ante.type !== 'none' ? (
          <Text style={styles.infoText}>
            Ante: {game.settings.ante.type} {game.settings.ante.amount}
          </Text>
        ) : null}
      </View>
    </ScrollView>
    <GameChat gameCode={gameCode} />
    </View>
  );
}

// Web styles - dark poker theme
const webStyles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#1a1d21',
  },
  contentContainer: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 48,
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1d21',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
  },
  header: {
    width: '100%',
    maxWidth: 900,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  gameCode: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  blindsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  leaveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  leaveButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
  },
  errorContainer: {
    width: '100%',
    maxWidth: 900,
    marginBottom: 16,
  },
  error: {
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    textAlign: 'center',
  },

  // Table styles
  tableContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  tableFelt: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    right: '10%',
    bottom: '15%',
    backgroundColor: '#2d5a3d',
    borderRadius: 150,
    borderWidth: 8,
    borderColor: '#1f3d2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  potContainer: {
    position: 'absolute',
    top: '20%',
    alignItems: 'center',
  },
  potLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  potAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  communityCards: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityCard: {
    width: 60,
    height: 84,
    borderRadius: 8,
  },
  noCardsText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  phaseContainer: {
    position: 'absolute',
    bottom: '20%',
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },

  // Seat styles
  seatContainer: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
    zIndex: 10,
  },
  seatActive: {
    zIndex: 20,
  },
  seatMe: {},
  seatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b4a5a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2a3642',
  },
  seatAvatarActive: {
    borderColor: '#22c55e',
    borderWidth: 3,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  seatAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  seatName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
    maxWidth: 70,
  },
  seatStack: {
    fontSize: 14,
    fontWeight: '800',
    color: '#22c55e',
  },
  positionBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  positionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  statusBadge: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  allInBadge: {
    backgroundColor: '#ef4444',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  emptySeat: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySeatText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
  },
  emptySeatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },

  // My cards section
  myCardsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  myCardsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  myCards: {
    flexDirection: 'row',
    gap: 12,
  },
  myCard: {
    width: 80,
    height: 112,
    borderRadius: 10,
  },

  // Actions
  actionsContainer: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  turnIndicator: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 16,
  },
  turnIndicatorText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  foldButton: {
    backgroundColor: '#6b7280',
  },
  checkButton: {
    backgroundColor: '#3b82f6',
  },
  callButton: {
    backgroundColor: '#22c55e',
  },
  allInButton: {
    backgroundColor: '#ef4444',
  },
  raiseButton: {
    backgroundColor: '#f59e0b',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  raiseRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raiseInput: {
    flex: 1,
    maxWidth: 150,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
  },

  // Host controls
  hostControls: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hostLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  hostButtonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  hostButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  hostButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  endGameButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  endGameButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Result card
  resultCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#22c55e',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  resultReason: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },

  // Rebuy card
  rebuyCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
  },
  rebuyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f59e0b',
    marginBottom: 8,
  },
  rebuyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  rebuyRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  rebuyInput: {
    width: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
  },
  rebuyButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  rebuyButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  // History
  historyToggle: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  historyToggleText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    fontSize: 13,
  },
  historyCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  historyLine: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },

  // Info card
  infoCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
});

// Mobile styles - similar but adjusted for smaller screens
const mobileStyles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#1a1d21',
  },
  contentContainer: {
    alignItems: 'center',
    padding: 16,
    paddingBottom: 32,
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1d21',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  gameCode: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  blindsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  leaveButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  leaveButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    fontSize: 13,
  },
  errorContainer: {
    width: '100%',
    marginBottom: 12,
  },
  error: {
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 13,
  },

  // Table styles
  tableContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  tableFelt: {
    position: 'absolute',
    top: '18%',
    left: '12%',
    right: '12%',
    bottom: '18%',
    backgroundColor: '#2d5a3d',
    borderRadius: 100,
    borderWidth: 6,
    borderColor: '#1f3d2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  potContainer: {
    position: 'absolute',
    top: '18%',
    alignItems: 'center',
  },
  potLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  potAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  communityCards: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityCard: {
    width: 40,
    height: 56,
    borderRadius: 6,
  },
  noCardsText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  phaseContainer: {
    position: 'absolute',
    bottom: '18%',
  },
  phaseText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },

  // Seat styles
  seatContainer: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  seatActive: {
    zIndex: 20,
  },
  seatMe: {},
  seatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b4a5a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2a3642',
  },
  seatAvatarActive: {
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  seatAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  seatName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
    maxWidth: 55,
  },
  seatStack: {
    fontSize: 11,
    fontWeight: '800',
    color: '#22c55e',
  },
  positionBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 1,
  },
  positionBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
  },
  statusBadge: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 1,
  },
  allInBadge: {
    backgroundColor: '#ef4444',
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
  },
  emptySeat: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySeatText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
  },
  emptySeatLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },

  // My cards section
  myCardsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  myCardsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  myCards: {
    flexDirection: 'row',
    gap: 8,
  },
  myCard: {
    width: 60,
    height: 84,
    borderRadius: 8,
  },

  // Actions
  actionsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  turnIndicator: {
    backgroundColor: '#22c55e',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'center',
    marginBottom: 12,
  },
  turnIndicatorText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  foldButton: {
    backgroundColor: '#6b7280',
  },
  checkButton: {
    backgroundColor: '#3b82f6',
  },
  callButton: {
    backgroundColor: '#22c55e',
  },
  allInButton: {
    backgroundColor: '#ef4444',
  },
  raiseButton: {
    backgroundColor: '#f59e0b',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  raiseRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raiseInput: {
    flex: 1,
    maxWidth: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },

  // Host controls
  hostControls: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hostLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  hostButtonRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  hostButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  hostButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  endGameButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  endGameButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Result card
  resultCard: {
    width: '100%',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#22c55e',
    marginBottom: 6,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  resultReason: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },

  // Rebuy card
  rebuyCard: {
    width: '100%',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
  },
  rebuyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f59e0b',
    marginBottom: 6,
  },
  rebuyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  rebuyRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  rebuyInput: {
    width: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  rebuyButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  rebuyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // History
  historyToggle: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },
  historyToggleText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    fontSize: 12,
  },
  historyCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  historyTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  historyLine: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },

  // Info card
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 3,
  },
});
