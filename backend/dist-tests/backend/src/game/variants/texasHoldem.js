"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TexasHoldem = void 0;
exports.createDefaultTexasHoldemSettings = createDefaultTexasHoldemSettings;
const engine_1 = require("../engine");
const validateSettings_1 = require("../../utils/validateSettings");
/**
 * Texas Hold'em variant
 * Each player receives 2 hole cards, 5 community cards are dealt
 */
class TexasHoldem extends engine_1.GameEngine {
    constructor(settings, gameCode) {
        const fullSettings = {
            ...settings,
            variant: 'texas-holdem',
        };
        super(fullSettings, gameCode);
    }
    /**
     * Texas Hold'em specific validation
     */
    validateSettings(settings) {
        const validation = (0, validateSettings_1.validateGameSettings)(settings);
        if (!validation.valid) {
            throw new Error(validation.error || 'Invalid game settings');
        }
        return true;
    }
    /**
     * Restores a TexasHoldem game from a snapshot.
     * Used to resume live games after server restart.
     */
    static fromSnapshot(snapshot) {
        // Use the parent class's fromSnapshot, then set the prototype to TexasHoldem
        const engine = engine_1.GameEngine.fromSnapshot(snapshot);
        Object.setPrototypeOf(engine, TexasHoldem.prototype);
        return engine;
    }
}
exports.TexasHoldem = TexasHoldem;
/**
 * Creates default Texas Hold'em settings
 */
function createDefaultTexasHoldemSettings() {
    return {
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
}
