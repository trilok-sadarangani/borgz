import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { BuyInModal } from '../../components/BuyInModal';
import { GameState } from '../../../shared/types/game.types';
import MagicBento from '../../components/MagicBento';

export default function LobbyScreen() {
  const router = useRouter();
  const { player, logout } = useAuthStore();
  const gameStore = useGameStore();
  const [code, setCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Buy-in modal state
  const [showBuyInModal, setShowBuyInModal] = useState(false);
  const [pendingGameCode, setPendingGameCode] = useState<string | null>(null);
  const [pendingGameState, setPendingGameState] = useState<GameState | null>(null);
  const [joiningGame, setJoiningGame] = useState(false);
  
  const normalizedCode = useMemo(() => code.trim().toUpperCase(), [code]);

  // Open buy-in modal for a game
  const handleOpenBuyIn = useCallback(async (gameCode: string) => {
    setPendingGameCode(gameCode);
    setJoiningGame(true);
    const gameState = await gameStore.getGameInfo(gameCode);
    setJoiningGame(false);
    if (gameState) {
      setPendingGameState(gameState);
      setShowBuyInModal(true);
      setShowJoinModal(false);
    }
  }, [gameStore]);

  // Confirm buy-in and join game
  const handleConfirmBuyIn = useCallback(async (buyIn: number) => {
    if (!player || !pendingGameCode) return;
    setJoiningGame(true);
    await gameStore.joinGame(pendingGameCode, player.id, player.name, buyIn);
    setJoiningGame(false);
    if (!useGameStore.getState().error) {
      setShowBuyInModal(false);
      setPendingGameCode(null);
      setPendingGameState(null);
      router.push('/(tabs)/game');
    }
  }, [player, pendingGameCode, gameStore, router]);

  // Cancel buy-in modal
  const handleCancelBuyIn = useCallback(() => {
    setShowBuyInModal(false);
    setPendingGameCode(null);
    setPendingGameState(null);
  }, []);

  const handleQuickPlay = async () => {
    if (!player) return;
    try {
      const newCode = await gameStore.createGame({});
      await handleOpenBuyIn(newCode);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create game';
      useGameStore.setState({ error: msg });
    }
  };

  const handleJoinGame = async () => {
    if (!player || !normalizedCode) return;
    await handleOpenBuyIn(normalizedCode);
  };

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        body, html {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        
        .bento-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          height: 100vh;
          width: 100vw;
          position: relative;
          z-index: 10;
          padding: 4rem 2rem 2rem 2rem;
          box-sizing: border-box;
          overflow: hidden;
        }
        
        .bento-header {
          position: fixed;
          top: 1rem;
          right: 1.5rem;
          display: flex;
          gap: 0.75rem;
          align-items: center;
          z-index: 100;
        }
        
        .user-info {
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          padding: 8px 14px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }
        
        .logout-btn {
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          padding: 8px 14px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.2s;
        }
        
        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          border-color: rgba(239, 68, 68, 0.5);
          transform: translateY(-1px);
        }
        
        .bento-logo {
          position: fixed;
          top: 1rem;
          left: 1.5rem;
          font-size: 36px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -2px;
          z-index: 100;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        
        .join-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(10px);
        }
        
        .join-modal-content {
          background: #1a1a2e;
          border: 1px solid rgba(132, 0, 255, 0.3);
          border-radius: 20px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          min-width: 300px;
        }
        
        .join-modal-title {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 1rem;
        }
        
        .join-modal-input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 16px;
          color: #fff;
          text-align: center;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        
        .join-modal-buttons {
          display: flex;
          gap: 1rem;
        }
        
        .join-modal-btn {
          flex: 1;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        
        .join-modal-btn-primary {
          background: #22c55e;
          color: #fff;
        }
        
        .join-modal-btn-primary:hover {
          background: #16a34a;
        }
        
        .join-modal-btn-secondary {
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .join-modal-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
      
      <div className="bento-wrapper">
        <div className="bento-logo">borgz</div>
        
        <div className="bento-header">
          <div className="user-info">👋 {player?.name}</div>
          <button className="logout-btn" onClick={() => { logout(); router.replace('/login'); }}>
            Logout
          </button>
        </div>

        <div className="card-grid">
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="132, 0, 255"
            title="Quick Play"
            description="Start a game instantly with default settings"
            onClick={handleQuickPlay}
          />
          
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="34, 197, 94"
            title="Join Game"
            description="Enter a game code to join"
            onClick={() => setShowJoinModal(true)}
          />
          
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="59, 130, 246"
            title="Clubs"
            description="Manage your poker clubs and memberships"
            onClick={() => router.push('/(tabs)/clubs')}
          />
          
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="236, 72, 153"
            title="Profile & Stats"
            description="View your games and statistics"
            onClick={() => router.push('/(tabs)/profile')}
          />
          
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="251, 191, 36"
            title="Coming Soon"
            description="More features on the way"
          />
          
          <MagicBento
            textAutoHide={true}
            enableSpotlight
            enableBorderGlow={true}
            enableTilt
            clickEffect
            spotlightRadius={280}
            particleCount={12}
            glowColor="168, 85, 247"
            title="Plus"
            description="Premium features and benefits"
            onClick={() => router.push('/(tabs)/plus')}
          />
        </div>

        {showJoinModal && (
          <div className="join-modal-overlay" onClick={() => setShowJoinModal(false)}>
            <div className="join-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="join-modal-title">Join Game</h2>
              <input
                type="text"
                className="join-modal-input"
                placeholder="Enter game code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
              <div className="join-modal-buttons">
                <button 
                  className="join-modal-btn join-modal-btn-secondary"
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="join-modal-btn join-modal-btn-primary"
                  onClick={() => {
                    handleJoinGame();
                    setShowJoinModal(false);
                  }}
                  disabled={joiningGame || !normalizedCode}
                >
                  {joiningGame ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BuyInModal
        visible={showBuyInModal}
        gameCode={pendingGameCode || ''}
        gameSettings={pendingGameState?.settings || null}
        onConfirm={handleConfirmBuyIn}
        onCancel={handleCancelBuyIn}
        loading={joiningGame}
      />
    </>
  );
}
