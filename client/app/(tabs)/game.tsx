import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Keyboard,
  Platform,
  Modal,
} from 'react-native';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { PlayingCard, CardSuit } from '../../components/PlayingCard';
import { GameChat } from '../../components/GameChat';

const isWeb = Platform.OS === 'web';

// Seat positions for a horizontal table layout (percentages from center)
// Bottom row and top row for a more horizontal, landscape-oriented table
const SEAT_POSITIONS = [
  { x: 0, y: 35 }, // bottom center (seat 1)
  { x: -20, y: 35 }, // bottom left-center (seat 2)
  { x: -40, y: 30 }, // bottom left (seat 3)
  { x: -50, y: 10 }, // left (seat 4)
  { x: -50, y: -10 }, // left upper (seat 5)
  { x: -40, y: -30 }, // top left (seat 6)
  { x: -20, y: -35 }, // top left-center (seat 7)
  { x: 0, y: -35 }, // top center (seat 8)
  { x: 20, y: -35 }, // top right-center (seat 9)
  { x: 40, y: -30 }, // top right (seat 10)
  { x: 50, y: -10 }, // right upper (seat 11)
  { x: 50, y: 10 }, // right (seat 12)
  { x: 40, y: 30 }, // bottom right (seat 13)
  { x: 20, y: 35 }, // bottom right-center (seat 14)
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
  const [showErrorModal, setShowErrorModal] = useState(false);

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

  // Determine which actions are available based on game state
  const availableActions = useMemo(() => {
    if (!game || !me || !isMyTurn || !me.cards || me.cards.length === 0) {
      return {
        canFold: false,
        canCheck: false,
        canCall: false,
        canRaise: false,
        canAllIn: false,
      };
    }

    const hasBet = game.currentBet > 0;
    const myCurrentBet = me.currentBet;
    const needToCall = hasBet && myCurrentBet < game.currentBet;

    return {
      canFold: hasBet, // Only show fold if there's a bet to act on
      canCheck: !needToCall, // Can check if no bet or already matched
      canCall: needToCall, // Can call only if there's a bet to match
      canRaise: true, // Can always raise (will be limited by stack)
      canAllIn: me.stack > 0, // Can go all-in if have chips
    };
  }, [game, me, isMyTurn]);

  // Calculate raise amount slider value
  const raiseSliderValue = useMemo(() => {
    const amt = Number(raiseAmount);
    if (!Number.isFinite(amt) || !me) return 0;
    return Math.min(amt, me.stack);
  }, [raiseAmount, me]);

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
    <View style={styles.gameContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.gameCode}>Game {gameCode}</Text>
          <Text style={styles.blindsText}>
            NLH • {game.settings.smallBlind}/{game.settings.bigBlind}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {error ? (
            <Pressable onPress={clearError} style={styles.errorBadge}>
              <Text style={styles.errorBadgeText}>Error</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.leaveButton} onPress={() => leaveGame()}>
            <Text style={styles.leaveButtonText}>Leave</Text>
          </Pressable>
        </View>
      </View>

      {/* Main game area - table fills available space */}
      <View style={styles.tableArea}>
        {/* Poker Table */}
        <View style={styles.tableContainer}>
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

      </View>

      {/* Bottom section: Your cards + Actions */}
      <View style={styles.bottomSection}>
        {/* Your cards - positioned on left side */}
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

          {/* Result overlay */}
          {game.phase === 'finished' && game.lastHandResult ? (
            <View style={styles.resultOverlay}>
              <Text style={styles.resultText}>
                {game.lastHandResult.winners.map((w) => `${w.playerId} won ${w.amount}`).join(' | ')}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            {availableActions.canFold && (
              <Pressable
                style={[styles.actionButton, styles.foldButton]}
                onPress={() => act('fold')}
              >
                <Text style={styles.actionButtonText}>Fold</Text>
              </Pressable>
            )}
            {availableActions.canCheck && (
              <Pressable
                style={[styles.actionButton, styles.checkButton]}
                onPress={() => act('check')}
              >
                <Text style={styles.actionButtonText}>Check</Text>
              </Pressable>
            )}
            {availableActions.canCall && (
              <Pressable
                style={[styles.actionButton, styles.callButton]}
                onPress={() => act('call')}
              >
                <Text style={styles.actionButtonText}>
                  Call {game ? game.currentBet - (me?.currentBet || 0) : ''}
                </Text>
              </Pressable>
            )}
            {availableActions.canRaise && (
              <View style={styles.raiseGroup}>
                <View style={styles.raiseControls}>
                  <TextInput
                    value={raiseAmount}
                    onChangeText={(val) => {
                      const num = Number(val);
                      if (me && Number.isFinite(num)) {
                        setRaiseAmount(Math.min(num, me.stack).toString());
                      } else {
                        setRaiseAmount(val);
                      }
                    }}
                    placeholder="Amount"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="numeric"
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                    style={styles.raiseInput}
                  />
                  {isWeb && me && (
                    <input
                      type="range"
                      min={game?.currentBet || 0}
                      max={me.stack}
                      value={raiseSliderValue}
                      onChange={(e) => setRaiseAmount(e.target.value)}
                      aria-label="Raise amount"
                      style={{
                        width: '120px',
                        accentColor: '#f59e0b',
                      }}
                    />
                  )}
                </View>
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
            )}
            {availableActions.canAllIn && (
              <Pressable
                style={[styles.actionButton, styles.allInButton]}
                onPress={() => act('all-in')}
              >
                <Text style={styles.actionButtonText}>All-in</Text>
              </Pressable>
            )}
          </View>

          {/* Host controls inline */}
          {isHost ? (
            <View style={styles.hostRow}>
              {game.phase === 'waiting' ? (
                <Pressable
                  style={styles.hostButton}
                  onPress={() => startGame(gameCode, player.id)}
                >
                  <Text style={styles.hostButtonText}>Start</Text>
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
                <Text style={styles.endGameButtonText}>End</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Rebuy inline if needed */}
          {me && me.stack === 0 ? (
            <View style={styles.rebuyRow}>
              <Text style={styles.rebuyText}>Out of chips!</Text>
              <TextInput
                value={rebuyAmount}
                onChangeText={setRebuyAmount}
                placeholder="Amount"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="numeric"
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
                <Text style={styles.rebuyButtonText}>Rebuy</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <GameChat gameCode={gameCode} />

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowErrorModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Not Enough Players</Text>
            <Text style={styles.modalMessage}>
              You need at least 2 players seated at the table to start the game.
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// Web styles - dark poker theme (full viewport, no scroll)
const webStyles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: '#1a1d21',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1d21',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tableArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  errorBadgeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
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
    display: 'none',
  },
  error: {
    display: 'none',
  },

  // Table styles
  tableContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    maxWidth: 1200,
  },
  tableFelt: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    bottom: '20%',
    backgroundColor: '#2d5a3d',
    borderRadius: 9999,
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
  },
  myCardsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 6,
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
    flex: 1,
    alignItems: 'center',
  },
  raiseGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultOverlay: {
    marginBottom: 8,
  },
  resultText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '700',
  },
  hostRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
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
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 70,
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
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raiseInput: {
    width: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },

  // Host controls (inline)
  hostControls: {},
  hostLabel: {
    display: 'none',
  },
  hostButtonRow: {},
  hostButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  hostButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  endGameButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  endGameButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Result card (now inline as resultOverlay)
  resultCard: {
    display: 'none',
  },
  resultTitle: {
    display: 'none',
  },
  resultReason: {
    display: 'none',
  },

  // Rebuy (inline)
  rebuyCard: {},
  rebuyTitle: {
    display: 'none',
  },
  rebuyText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '700',
  },
  rebuyRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rebuyInput: {
    width: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
  },
  rebuyButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  rebuyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  // History (hidden in full-screen view)
  historyToggle: {
    display: 'none',
  },
  historyToggleText: {},
  historyCard: {
    display: 'none',
  },
  historyTitle: {},
  historyLine: {},

  // Info card (hidden in full-screen view)
  infoCard: {
    display: 'none',
  },
  infoTitle: {},
  infoText: {},
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
