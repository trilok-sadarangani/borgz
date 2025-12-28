"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGameSettings = validateGameSettings;
/**
 * Validates game settings
 */
function validateGameSettings(settings) {
    // Validate small blind
    if (settings.smallBlind !== undefined) {
        if (!Number.isFinite(settings.smallBlind) || settings.smallBlind <= 0) {
            return { valid: false, error: 'Small blind must be a positive number' };
        }
        if (settings.smallBlind < 1) {
            return { valid: false, error: 'Small blind must be at least 1' };
        }
    }
    // Validate big blind
    if (settings.bigBlind !== undefined) {
        if (!Number.isFinite(settings.bigBlind) || settings.bigBlind <= 0) {
            return { valid: false, error: 'Big blind must be a positive number' };
        }
        if (settings.bigBlind < 1) {
            return { valid: false, error: 'Big blind must be at least 1' };
        }
    }
    // Validate big blind is at least double small blind
    if (settings.smallBlind !== undefined && settings.bigBlind !== undefined) {
        if (settings.bigBlind < settings.smallBlind) {
            return { valid: false, error: 'Big blind must be greater than or equal to small blind' };
        }
        if (settings.bigBlind < settings.smallBlind * 2) {
            return { valid: false, error: 'Big blind should typically be at least double the small blind' };
        }
    }
    // Validate starting stack
    if (settings.startingStack !== undefined) {
        if (!Number.isFinite(settings.startingStack) || settings.startingStack <= 0) {
            return { valid: false, error: 'Starting stack must be a positive number' };
        }
        if (settings.bigBlind !== undefined && settings.startingStack < settings.bigBlind * 10) {
            return {
                valid: false,
                error: 'Starting stack should be at least 10 times the big blind for a reasonable game',
            };
        }
    }
    // Validate stack range (optional)
    if (settings.stackRange !== undefined) {
        const { min, max } = settings.stackRange;
        if (!Number.isFinite(min) || min <= 0) {
            return { valid: false, error: 'Stack range min must be a positive number' };
        }
        if (!Number.isFinite(max) || max <= 0) {
            return { valid: false, error: 'Stack range max must be a positive number' };
        }
        if (max < min) {
            return { valid: false, error: 'Stack range max must be greater than or equal to min' };
        }
    }
    // Validate max players
    if (settings.maxPlayers !== undefined) {
        if (!Number.isInteger(settings.maxPlayers) || settings.maxPlayers < 2) {
            return { valid: false, error: 'Max players must be at least 2' };
        }
        if (settings.maxPlayers > 10) {
            return { valid: false, error: 'Max players cannot exceed 10' };
        }
    }
    // Validate turn timer (optional)
    if (settings.turnTimerSeconds !== undefined) {
        if (!Number.isFinite(settings.turnTimerSeconds) || settings.turnTimerSeconds <= 0) {
            return { valid: false, error: 'Turn timer must be a positive number (seconds)' };
        }
        if (settings.turnTimerSeconds < 5) {
            return { valid: false, error: 'Turn timer must be at least 5 seconds' };
        }
    }
    // Validate time bank config (optional)
    if (settings.timeBankConfig !== undefined) {
        const { banks, secondsPerBank } = settings.timeBankConfig;
        if (!Number.isInteger(banks) || banks < 0 || banks > 20) {
            return { valid: false, error: 'Time bank count must be an integer between 0 and 20' };
        }
        if (!Number.isFinite(secondsPerBank) || secondsPerBank < 5 || secondsPerBank > 120) {
            return { valid: false, error: 'Time bank seconds must be between 5 and 120' };
        }
    }
    // Validate ante (optional)
    if (settings.ante !== undefined) {
        const { type, amount } = settings.ante;
        if (type !== 'none' && type !== 'ante' && type !== 'bb-ante') {
            return { valid: false, error: 'Ante type must be none, ante, or bb-ante' };
        }
        if (!Number.isFinite(amount) || amount < 0) {
            return { valid: false, error: 'Ante amount must be a non-negative number' };
        }
        if (type !== 'none' && amount === 0) {
            return { valid: false, error: 'Ante amount must be > 0 when ante is enabled' };
        }
    }
    // Validate game length (optional)
    if (settings.gameLengthMinutes !== undefined) {
        if (!Number.isFinite(settings.gameLengthMinutes) || settings.gameLengthMinutes <= 0) {
            return { valid: false, error: 'Game length must be a positive number (minutes)' };
        }
        if (settings.gameLengthMinutes < 5) {
            return { valid: false, error: 'Game length must be at least 5 minutes' };
        }
    }
    return { valid: true };
}
