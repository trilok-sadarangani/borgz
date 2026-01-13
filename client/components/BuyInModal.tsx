import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Platform,
  Keyboard,
} from 'react-native';
import { GameSettings } from '../../shared/types/game.types';

const isWeb = Platform.OS === 'web';

interface BuyInModalProps {
  visible: boolean;
  gameCode: string;
  gameSettings: GameSettings | null;
  onConfirm: (buyIn: number) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function BuyInModal({
  visible,
  gameCode,
  gameSettings,
  onConfirm,
  onCancel,
  loading = false,
}: BuyInModalProps) {
  const defaultStack = gameSettings?.startingStack ?? 1000;
  const minBuyIn = gameSettings?.stackRange?.min ?? (gameSettings?.bigBlind ?? 10) * 20;
  const maxBuyIn = gameSettings?.stackRange?.max ?? defaultStack * 2;

  const [buyInAmount, setBuyInAmount] = useState(defaultStack.toString());
  const [error, setError] = useState<string | null>(null);

  // Reset to default when modal opens with new game
  useEffect(() => {
    if (visible && gameSettings) {
      setBuyInAmount(defaultStack.toString());
      setError(null);
    }
  }, [visible, defaultStack, gameSettings]);

  const handleConfirm = () => {
    const amount = Number(buyInAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (amount < minBuyIn) {
      setError(`Minimum buy-in is ${minBuyIn}`);
      return;
    }
    if (amount > maxBuyIn) {
      setError(`Maximum buy-in is ${maxBuyIn}`);
      return;
    }
    setError(null);
    Keyboard.dismiss();
    onConfirm(amount);
  };

  const handleQuickSelect = (amount: number) => {
    setBuyInAmount(amount.toString());
    setError(null);
  };

  const blindsText = gameSettings
    ? `${gameSettings.smallBlind}/${gameSettings.bigBlind}`
    : '?/?';

  const quickAmounts = [
    { label: 'Min', value: minBuyIn },
    { label: '50BB', value: (gameSettings?.bigBlind ?? 10) * 50 },
    { label: '100BB', value: (gameSettings?.bigBlind ?? 10) * 100 },
    { label: 'Max', value: maxBuyIn },
  ].filter((a) => a.value >= minBuyIn && a.value <= maxBuyIn);

  const s = isWeb ? webStyles : mobileStyles;

  const content = (
    <View style={s.modalOverlay}>
      <View style={s.modalContent}>
        <Text style={s.modalTitle}>Buy In</Text>
        <Text style={s.modalSubtitle}>
          Game {gameCode} • Blinds {blindsText}
        </Text>

        <View style={s.rangeInfo}>
          <Text style={s.rangeText}>
            Min: {minBuyIn} • Max: {maxBuyIn}
          </Text>
        </View>

        <View style={s.quickSelectRow}>
          {quickAmounts.map((qa) => (
            <Pressable
              key={qa.label}
              style={[
                s.quickSelectButton,
                buyInAmount === qa.value.toString() && s.quickSelectButtonActive,
              ]}
              onPress={() => handleQuickSelect(qa.value)}
            >
              <Text
                style={[
                  s.quickSelectText,
                  buyInAmount === qa.value.toString() && s.quickSelectTextActive,
                ]}
              >
                {qa.label}
              </Text>
              <Text
                style={[
                  s.quickSelectAmount,
                  buyInAmount === qa.value.toString() && s.quickSelectTextActive,
                ]}
              >
                {qa.value}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={s.inputContainer}>
          <Text style={s.inputLabel}>Custom Amount</Text>
          <TextInput
            value={buyInAmount}
            onChangeText={(text) => {
              setBuyInAmount(text);
              setError(null);
            }}
            placeholder="Enter amount"
            placeholderTextColor={isWeb ? 'rgba(255,255,255,0.4)' : '#999'}
            keyboardType="numeric"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={handleConfirm}
            style={s.input}
          />
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <View style={s.buttonRow}>
          <Pressable style={s.cancelButton} onPress={onCancel} disabled={loading}>
            <Text style={s.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[s.confirmButton, loading && s.buttonDisabled]}
            onPress={handleConfirm}
            disabled={loading}
          >
            <Text style={s.confirmButtonText}>
              {loading ? 'Joining...' : 'Join Game'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (isWeb) {
    // On web, use a simple overlay instead of Modal for better styling
    if (!visible) return null;
    return content;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {content}
    </Modal>
  );
}

// Web styles - dark theme
const webStyles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1a1d21',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  rangeInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  rangeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  quickSelectButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickSelectButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22c55e',
  },
  quickSelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  quickSelectAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  quickSelectTextActive: {
    color: '#22c55e',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '700',
    fontSize: 15,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

// Mobile styles - light theme
const mobileStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  rangeInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  rangeText: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  quickSelectButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  quickSelectButtonActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#22c55e',
  },
  quickSelectText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    marginBottom: 2,
  },
  quickSelectAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },
  quickSelectTextActive: {
    color: '#22c55e',
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: '#111',
    textAlign: 'center',
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#555',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
