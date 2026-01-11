import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Switch, Platform } from 'react-native';
import { GameSettings } from '../../shared/types/game.types';

const isWeb = Platform.OS === 'web';

interface GameSettingsFormProps {
  initialSettings?: Partial<GameSettings>;
  onSubmit: (settings: Partial<GameSettings>) => void;
  onCancel?: () => void;
}

const DEFAULT_SETTINGS: Omit<GameSettings, 'variant'> = {
  smallBlind: 10,
  bigBlind: 20,
  startingStack: 1000,
  stackRange: { min: 500, max: 5000 },
  maxPlayers: 9,
  turnTimerSeconds: 20,
  timeBankConfig: { banks: 5, secondsPerBank: 20 },
  ante: { type: 'none', amount: 0 },
  gameLengthMinutes: undefined,
};

export function GameSettingsForm({ initialSettings, onSubmit, onCancel }: GameSettingsFormProps) {
  const [smallBlind, setSmallBlind] = useState(
    initialSettings?.smallBlind?.toString() || DEFAULT_SETTINGS.smallBlind.toString()
  );
  const [bigBlind, setBigBlind] = useState(
    initialSettings?.bigBlind?.toString() || DEFAULT_SETTINGS.bigBlind.toString()
  );
  const [startingStack, setStartingStack] = useState(
    initialSettings?.startingStack?.toString() || DEFAULT_SETTINGS.startingStack.toString()
  );
  const [stackMin, setStackMin] = useState(
    initialSettings?.stackRange?.min?.toString() || DEFAULT_SETTINGS.stackRange?.min?.toString() || '500'
  );
  const [stackMax, setStackMax] = useState(
    initialSettings?.stackRange?.max?.toString() || DEFAULT_SETTINGS.stackRange?.max?.toString() || '5000'
  );
  const [maxPlayers, setMaxPlayers] = useState(
    initialSettings?.maxPlayers?.toString() || DEFAULT_SETTINGS.maxPlayers.toString()
  );
  const [turnTimerSeconds, setTurnTimerSeconds] = useState(
    initialSettings?.turnTimerSeconds?.toString() ||
      DEFAULT_SETTINGS.turnTimerSeconds?.toString() ||
      '20'
  );

  const [hasTimeBank, setHasTimeBank] = useState(initialSettings?.timeBankConfig !== undefined);
  const [timeBankCount, setTimeBankCount] = useState(
    initialSettings?.timeBankConfig?.banks?.toString() ||
      DEFAULT_SETTINGS.timeBankConfig?.banks?.toString() ||
      '5'
  );
  const [timeBankSeconds, setTimeBankSeconds] = useState(
    initialSettings?.timeBankConfig?.secondsPerBank?.toString() ||
      DEFAULT_SETTINGS.timeBankConfig?.secondsPerBank?.toString() ||
      '20'
  );

  const [hasAnte, setHasAnte] = useState(
    !!initialSettings?.ante && initialSettings?.ante?.type !== 'none'
  );
  const [bbAnte, setBbAnte] = useState(initialSettings?.ante?.type === 'bb-ante');
  const [anteAmount, setAnteAmount] = useState(
    initialSettings?.ante?.amount?.toString() || DEFAULT_SETTINGS.ante?.amount?.toString() || '0'
  );

  const [hasGameLength, setHasGameLength] = useState(initialSettings?.gameLengthMinutes !== undefined);
  const [gameLengthMinutes, setGameLengthMinutes] = useState(
    initialSettings?.gameLengthMinutes?.toString() || '60'
  );

  const s = isWeb ? webStyles : styles;

  const handleSubmit = () => {
    const smallBlindNum = Number(smallBlind);
    const bigBlindNum = Number(bigBlind);
    const startingStackNum = Number(startingStack);
    const stackMinNum = Number(stackMin);
    const stackMaxNum = Number(stackMax);
    const maxPlayersNum = Number(maxPlayers);
    const turnTimerNum = Number(turnTimerSeconds);
    const timeBankCountNum = Number(timeBankCount);
    const timeBankSecondsNum = Number(timeBankSeconds);
    const anteAmountNum = Number(anteAmount);
    const gameLengthNum = hasGameLength ? Number(gameLengthMinutes) : undefined;

    if (!Number.isFinite(smallBlindNum) || smallBlindNum <= 0) {
      alert('Small blind must be a positive number');
      return;
    }
    if (!Number.isFinite(bigBlindNum) || bigBlindNum <= 0) {
      alert('Big blind must be a positive number');
      return;
    }
    if (bigBlindNum < smallBlindNum) {
      alert('Big blind must be greater than or equal to small blind');
      return;
    }
    if (!Number.isFinite(startingStackNum) || startingStackNum <= 0) {
      alert('Starting stack must be a positive number');
      return;
    }
    if (!Number.isFinite(stackMinNum) || stackMinNum <= 0) {
      alert('Stack range min must be a positive number');
      return;
    }
    if (!Number.isFinite(stackMaxNum) || stackMaxNum <= 0 || stackMaxNum < stackMinNum) {
      alert('Stack range max must be >= min');
      return;
    }
    if (!Number.isInteger(maxPlayersNum) || maxPlayersNum < 2 || maxPlayersNum > 10) {
      alert('Max players must be between 2 and 10');
      return;
    }
    if (!Number.isFinite(turnTimerNum) || turnTimerNum < 5) {
      alert('Turn timer must be at least 5 seconds');
      return;
    }
    if (hasTimeBank) {
      if (!Number.isInteger(timeBankCountNum) || timeBankCountNum < 0 || timeBankCountNum > 20) {
        alert('Time bank count must be between 0 and 20');
        return;
      }
      if (!Number.isFinite(timeBankSecondsNum) || timeBankSecondsNum < 5 || timeBankSecondsNum > 120) {
        alert('Time bank seconds must be between 5 and 120');
        return;
      }
    }
    if (hasAnte) {
      if (!Number.isFinite(anteAmountNum) || anteAmountNum <= 0) {
        alert('Ante amount must be > 0');
        return;
      }
    }
    if (hasGameLength) {
      if (!Number.isFinite(gameLengthNum) || gameLengthNum! < 5) {
        alert('Game length must be at least 5 minutes');
        return;
      }
    }

    const settings: Partial<GameSettings> = {
      variant: 'texas-holdem',
      smallBlind: smallBlindNum,
      bigBlind: bigBlindNum,
      startingStack: startingStackNum,
      stackRange: { min: stackMinNum, max: stackMaxNum },
      maxPlayers: maxPlayersNum,
      turnTimerSeconds: turnTimerNum,
      timeBankConfig: hasTimeBank ? { banks: timeBankCountNum, secondsPerBank: timeBankSecondsNum } : undefined,
      ante: hasAnte
        ? { type: bbAnte ? 'bb-ante' : 'ante', amount: anteAmountNum }
        : { type: 'none', amount: 0 },
      gameLengthMinutes: hasGameLength ? gameLengthNum : undefined,
    };

    onSubmit(settings);
  };

  const handleReset = () => {
    setSmallBlind(DEFAULT_SETTINGS.smallBlind.toString());
    setBigBlind(DEFAULT_SETTINGS.bigBlind.toString());
    setStartingStack(DEFAULT_SETTINGS.startingStack.toString());
    setStackMin(DEFAULT_SETTINGS.stackRange?.min?.toString() || '500');
    setStackMax(DEFAULT_SETTINGS.stackRange?.max?.toString() || '5000');
    setMaxPlayers(DEFAULT_SETTINGS.maxPlayers.toString());
    setTurnTimerSeconds(DEFAULT_SETTINGS.turnTimerSeconds?.toString() || '20');
    setHasTimeBank(true);
    setTimeBankCount(DEFAULT_SETTINGS.timeBankConfig?.banks?.toString() || '5');
    setTimeBankSeconds(DEFAULT_SETTINGS.timeBankConfig?.secondsPerBank?.toString() || '20');
    setHasAnte(false);
    setBbAnte(false);
    setAnteAmount('0');
    setHasGameLength(false);
    setGameLengthMinutes('60');
  };

  if (isWeb) {
    return (
      <View style={webStyles.container}>
        {/* Row 1: Blinds and Stack */}
        <View style={webStyles.row}>
          <View style={webStyles.field}>
            <Text style={webStyles.label}>Small Blind</Text>
            <TextInput
              value={smallBlind}
              onChangeText={setSmallBlind}
              placeholder="10"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              style={webStyles.input}
            />
          </View>
          <View style={webStyles.field}>
            <Text style={webStyles.label}>Big Blind</Text>
            <TextInput
              value={bigBlind}
              onChangeText={setBigBlind}
              placeholder="20"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              style={webStyles.input}
            />
          </View>
          <View style={webStyles.field}>
            <Text style={webStyles.label}>Starting Stack</Text>
            <TextInput
              value={startingStack}
              onChangeText={setStartingStack}
              placeholder="1000"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              style={webStyles.input}
            />
          </View>
          <View style={webStyles.field}>
            <Text style={webStyles.label}>Max Players</Text>
            <TextInput
              value={maxPlayers}
              onChangeText={setMaxPlayers}
              placeholder="9"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              style={webStyles.input}
            />
          </View>
        </View>

        {/* Row 2: Stack Range and Timer */}
        <View style={webStyles.row}>
          <View style={webStyles.field}>
            <Text style={webStyles.label}>Stack Min</Text>
            <TextInput
              value={stackMin}
              onChangeText={setStackMin}
              placeholder="500"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              style={webStyles.input}
            />
          </View>
          <View style={webStyles.field}>
            <Text style={webStyles.label}>Stack Max</Text>
            <TextInput
              value={stackMax}
              onChangeText={setStackMax}
              placeholder="5000"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              style={webStyles.input}
            />
          </View>
          <View style={webStyles.field}>
            <Text style={webStyles.label}>Turn Timer (sec)</Text>
            <TextInput
              value={turnTimerSeconds}
              onChangeText={setTurnTimerSeconds}
              placeholder="20"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              style={webStyles.input}
            />
          </View>
          <View style={webStyles.fieldEmpty} />
        </View>

        {/* Row 3: Toggles */}
        <View style={webStyles.togglesRow}>
          {/* Time Bank */}
          <View style={webStyles.toggleGroup}>
            <View style={webStyles.toggleHeader}>
              <Text style={webStyles.toggleLabel}>Time Bank</Text>
              <Switch
                value={hasTimeBank}
                onValueChange={setHasTimeBank}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(34,197,94,0.5)' }}
                thumbColor={hasTimeBank ? '#22c55e' : 'rgba(255,255,255,0.5)'}
              />
            </View>
            {hasTimeBank && (
              <View style={webStyles.toggleInputs}>
                <View style={webStyles.miniField}>
                  <Text style={webStyles.miniLabel}>Banks</Text>
                  <TextInput
                    value={timeBankCount}
                    onChangeText={setTimeBankCount}
                    placeholder="5"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="numeric"
                    style={webStyles.miniInput}
                  />
                </View>
                <View style={webStyles.miniField}>
                  <Text style={webStyles.miniLabel}>Sec/bank</Text>
                  <TextInput
                    value={timeBankSeconds}
                    onChangeText={setTimeBankSeconds}
                    placeholder="20"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="numeric"
                    style={webStyles.miniInput}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Ante */}
          <View style={webStyles.toggleGroup}>
            <View style={webStyles.toggleHeader}>
              <Text style={webStyles.toggleLabel}>Ante</Text>
              <Switch
                value={hasAnte}
                onValueChange={setHasAnte}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(34,197,94,0.5)' }}
                thumbColor={hasAnte ? '#22c55e' : 'rgba(255,255,255,0.5)'}
              />
            </View>
            {hasAnte && (
              <View style={webStyles.toggleInputs}>
                <View style={webStyles.miniField}>
                  <Text style={webStyles.miniLabel}>BB Ante</Text>
                  <Switch
                    value={bbAnte}
                    onValueChange={setBbAnte}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(34,197,94,0.5)' }}
                    thumbColor={bbAnte ? '#22c55e' : 'rgba(255,255,255,0.5)'}
                  />
                </View>
                <View style={webStyles.miniField}>
                  <Text style={webStyles.miniLabel}>Amount</Text>
                  <TextInput
                    value={anteAmount}
                    onChangeText={setAnteAmount}
                    placeholder="0"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="numeric"
                    style={webStyles.miniInput}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Game Length */}
          <View style={webStyles.toggleGroup}>
            <View style={webStyles.toggleHeader}>
              <Text style={webStyles.toggleLabel}>Game Length</Text>
              <Switch
                value={hasGameLength}
                onValueChange={setHasGameLength}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(34,197,94,0.5)' }}
                thumbColor={hasGameLength ? '#22c55e' : 'rgba(255,255,255,0.5)'}
              />
            </View>
            {hasGameLength && (
              <View style={webStyles.toggleInputs}>
                <View style={webStyles.miniField}>
                  <Text style={webStyles.miniLabel}>Minutes</Text>
                  <TextInput
                    value={gameLengthMinutes}
                    onChangeText={setGameLengthMinutes}
                    placeholder="60"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="numeric"
                    style={webStyles.miniInput}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Buttons */}
        <View style={webStyles.buttonRow}>
          <Pressable style={webStyles.resetButton} onPress={handleReset}>
            <Text style={webStyles.resetButtonText}>Reset</Text>
          </Pressable>
          {onCancel && (
            <Pressable style={webStyles.cancelButton} onPress={onCancel}>
              <Text style={webStyles.cancelButtonText}>Cancel</Text>
            </Pressable>
          )}
          <Pressable style={webStyles.applyButton} onPress={handleSubmit}>
            <Text style={webStyles.applyButtonText}>Apply Settings</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Native (mobile) layout
  return (
    <View style={s.container}>
      <Text style={s.title}>Game Settings</Text>

      <View style={s.field}>
        <Text style={s.label}>Small Blind</Text>
        <TextInput
          value={smallBlind}
          onChangeText={setSmallBlind}
          placeholder="10"
          keyboardType="numeric"
          style={s.input}
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Big Blind</Text>
        <TextInput
          value={bigBlind}
          onChangeText={setBigBlind}
          placeholder="20"
          keyboardType="numeric"
          style={s.input}
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Starting Stack</Text>
        <TextInput
          value={startingStack}
          onChangeText={setStartingStack}
          placeholder="1000"
          keyboardType="numeric"
          style={s.input}
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Stack Range (min / max)</Text>
        <View style={s.rowInputs}>
          <TextInput
            value={stackMin}
            onChangeText={setStackMin}
            placeholder="500"
            keyboardType="numeric"
            style={[s.input, { flex: 1 }]}
          />
          <TextInput
            value={stackMax}
            onChangeText={setStackMax}
            placeholder="5000"
            keyboardType="numeric"
            style={[s.input, { flex: 1 }]}
          />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>Max Players</Text>
        <TextInput
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          placeholder="9"
          keyboardType="numeric"
          style={s.input}
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Turn Timer (seconds)</Text>
        <TextInput
          value={turnTimerSeconds}
          onChangeText={setTurnTimerSeconds}
          placeholder="20"
          keyboardType="numeric"
          style={s.input}
        />
      </View>

      <View style={s.field}>
        <View style={s.switchRow}>
          <Text style={s.label}>Enable Time Bank</Text>
          <Switch value={hasTimeBank} onValueChange={setHasTimeBank} />
        </View>
        {hasTimeBank && (
          <View style={s.rowInputs}>
            <TextInput
              value={timeBankCount}
              onChangeText={setTimeBankCount}
              placeholder="5"
              keyboardType="numeric"
              style={[s.input, { flex: 1 }]}
            />
            <TextInput
              value={timeBankSeconds}
              onChangeText={setTimeBankSeconds}
              placeholder="20"
              keyboardType="numeric"
              style={[s.input, { flex: 1 }]}
            />
          </View>
        )}
      </View>

      <View style={s.field}>
        <View style={s.switchRow}>
          <Text style={s.label}>Enable Ante</Text>
          <Switch value={hasAnte} onValueChange={setHasAnte} />
        </View>
        {hasAnte && (
          <>
            <View style={s.switchRow}>
              <Text style={s.label}>BB Ante</Text>
              <Switch value={bbAnte} onValueChange={setBbAnte} />
            </View>
            <TextInput
              value={anteAmount}
              onChangeText={setAnteAmount}
              placeholder="0"
              keyboardType="numeric"
              style={s.input}
            />
          </>
        )}
      </View>

      <View style={s.field}>
        <View style={s.switchRow}>
          <Text style={s.label}>Game Length (minutes)</Text>
          <Switch value={hasGameLength} onValueChange={setHasGameLength} />
        </View>
        {hasGameLength && (
          <TextInput
            value={gameLengthMinutes}
            onChangeText={setGameLengthMinutes}
            placeholder="60"
            keyboardType="numeric"
            style={s.input}
          />
        )}
      </View>

      <View style={s.buttonRow}>
        {onCancel && (
          <Pressable style={s.secondaryButton} onPress={onCancel}>
            <Text style={s.secondaryButtonText}>Cancel</Text>
          </Pressable>
        )}
        <Pressable style={s.resetButton} onPress={handleReset}>
          <Text style={s.resetButtonText}>Reset</Text>
        </Pressable>
        <Pressable style={s.primaryButton} onPress={handleSubmit}>
          <Text style={s.primaryButtonText}>Apply</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Web styles - horizontal desktop layout
const webStyles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  field: {
    flex: 1,
  },
  fieldEmpty: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
  },
  togglesRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  toggleGroup: {
    flex: 1,
    minWidth: 150,
  },
  toggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  toggleInputs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  miniField: {
    flex: 1,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  miniInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  resetButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    fontSize: 13,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    fontSize: 13,
  },
  applyButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#22c55e',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});

// Native styles - vertical mobile layout
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    width: '100%',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
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
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111',
  },
  secondaryButtonText: {
    color: '#111',
    fontWeight: '700',
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#999',
  },
  resetButtonText: {
    color: '#666',
    fontWeight: '600',
  },
});
