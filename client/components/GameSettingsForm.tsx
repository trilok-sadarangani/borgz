import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Switch } from 'react-native';
import { GameSettings } from '../../shared/types/game.types';

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

  const handleSubmit = () => {
    // Basic client-side validation
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Settings</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Small Blind</Text>
        <TextInput
          value={smallBlind}
          onChangeText={setSmallBlind}
          placeholder="10"
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Big Blind</Text>
        <TextInput
          value={bigBlind}
          onChangeText={setBigBlind}
          placeholder="20"
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Starting Stack</Text>
        <TextInput
          value={startingStack}
          onChangeText={setStartingStack}
          placeholder="1000"
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Stack Range (min / max)</Text>
        <View style={styles.row}>
          <TextInput
            value={stackMin}
            onChangeText={setStackMin}
            placeholder="500"
            keyboardType="numeric"
            style={[styles.input, { flex: 1 }]}
          />
          <TextInput
            value={stackMax}
            onChangeText={setStackMax}
            placeholder="5000"
            keyboardType="numeric"
            style={[styles.input, { flex: 1 }]}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Max Players</Text>
        <TextInput
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          placeholder="9"
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Turn Timer (seconds)</Text>
        <TextInput
          value={turnTimerSeconds}
          onChangeText={setTurnTimerSeconds}
          placeholder="20"
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Enable Time Bank</Text>
          <Switch value={hasTimeBank} onValueChange={setHasTimeBank} />
        </View>
        {hasTimeBank && (
          <View style={styles.row}>
            <TextInput
              value={timeBankCount}
              onChangeText={setTimeBankCount}
              placeholder="5"
              keyboardType="numeric"
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={timeBankSeconds}
              onChangeText={setTimeBankSeconds}
              placeholder="20"
              keyboardType="numeric"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        )}
      </View>

      <View style={styles.field}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Enable Ante</Text>
          <Switch value={hasAnte} onValueChange={setHasAnte} />
        </View>
        {hasAnte && (
          <>
            <View style={styles.switchRow}>
              <Text style={styles.label}>BB Ante</Text>
              <Switch value={bbAnte} onValueChange={setBbAnte} />
            </View>
            <TextInput
              value={anteAmount}
              onChangeText={setAnteAmount}
              placeholder="0"
              keyboardType="numeric"
              style={styles.input}
            />
          </>
        )}
      </View>

      <View style={styles.field}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Game Length (minutes)</Text>
          <Switch value={hasGameLength} onValueChange={setHasGameLength} />
        </View>
        {hasGameLength && (
          <TextInput
            value={gameLengthMinutes}
            onChangeText={setGameLengthMinutes}
            placeholder="60"
            keyboardType="numeric"
            style={styles.input}
          />
        )}
      </View>

      <View style={styles.buttonRow}>
        {onCancel && (
          <Pressable style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        )}
        <Pressable style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>Apply</Text>
        </Pressable>
      </View>
    </View>
  );
}

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
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
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

