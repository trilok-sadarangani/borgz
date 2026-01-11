import { useChatStore } from '../chatStore';
import { ChatMessage } from '../../../shared/types/game.types';

// Mock the socket service
jest.mock('../../services/socket', () => ({
  sendChatMessage: jest.fn(),
  onChatMessage: jest.fn(() => jest.fn()), // Returns unsubscribe function
}));

import { sendChatMessage, onChatMessage } from '../../services/socket';

const mockSendChatMessage = sendChatMessage as jest.Mock;
const mockOnChatMessage = onChatMessage as jest.Mock;

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatStore.setState({
      messages: [],
      isOpen: false,
      unreadCount: 0,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    test('has empty messages array', () => {
      expect(useChatStore.getState().messages).toEqual([]);
    });

    test('chat is closed by default', () => {
      expect(useChatStore.getState().isOpen).toBe(false);
    });

    test('unread count is 0', () => {
      expect(useChatStore.getState().unreadCount).toBe(0);
    });
  });

  describe('sendMessage', () => {
    test('calls socket sendChatMessage with trimmed message', () => {
      useChatStore.getState().sendMessage('  Hello world!  ');
      expect(mockSendChatMessage).toHaveBeenCalledWith('Hello world!');
    });

    test('does not call socket for empty message', () => {
      useChatStore.getState().sendMessage('');
      expect(mockSendChatMessage).not.toHaveBeenCalled();
    });

    test('does not call socket for whitespace-only message', () => {
      useChatStore.getState().sendMessage('   ');
      expect(mockSendChatMessage).not.toHaveBeenCalled();
    });
  });

  describe('toggleChat', () => {
    test('opens chat when closed', () => {
      expect(useChatStore.getState().isOpen).toBe(false);
      useChatStore.getState().toggleChat();
      expect(useChatStore.getState().isOpen).toBe(true);
    });

    test('closes chat when open', () => {
      useChatStore.setState({ isOpen: true });
      useChatStore.getState().toggleChat();
      expect(useChatStore.getState().isOpen).toBe(false);
    });

    test('resets unread count when opening chat', () => {
      useChatStore.setState({ isOpen: false, unreadCount: 5 });
      useChatStore.getState().toggleChat();
      expect(useChatStore.getState().unreadCount).toBe(0);
    });

    test('preserves unread count when closing chat', () => {
      useChatStore.setState({ isOpen: true, unreadCount: 3 });
      useChatStore.getState().toggleChat();
      expect(useChatStore.getState().unreadCount).toBe(3);
    });
  });

  describe('setOpen', () => {
    test('sets chat open state', () => {
      useChatStore.getState().setOpen(true);
      expect(useChatStore.getState().isOpen).toBe(true);

      useChatStore.getState().setOpen(false);
      expect(useChatStore.getState().isOpen).toBe(false);
    });

    test('resets unread count when opening', () => {
      useChatStore.setState({ unreadCount: 10 });
      useChatStore.getState().setOpen(true);
      expect(useChatStore.getState().unreadCount).toBe(0);
    });
  });

  describe('clearMessages', () => {
    test('removes all messages', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          gameCode: 'ABC123',
          playerId: 'p1',
          playerName: 'Alice',
          message: 'Hello',
          timestamp: Date.now(),
        },
        {
          id: '2',
          gameCode: 'ABC123',
          playerId: 'p2',
          playerName: 'Bob',
          message: 'Hi',
          timestamp: Date.now(),
        },
      ];
      useChatStore.setState({ messages });

      useChatStore.getState().clearMessages();
      expect(useChatStore.getState().messages).toEqual([]);
    });

    test('resets unread count', () => {
      useChatStore.setState({ unreadCount: 5 });
      useChatStore.getState().clearMessages();
      expect(useChatStore.getState().unreadCount).toBe(0);
    });
  });

  describe('markAsRead', () => {
    test('sets unread count to 0', () => {
      useChatStore.setState({ unreadCount: 10 });
      useChatStore.getState().markAsRead();
      expect(useChatStore.getState().unreadCount).toBe(0);
    });
  });

  describe('message handling (simulated)', () => {
    test('adding message to open chat does not increment unread', () => {
      useChatStore.setState({ isOpen: true, unreadCount: 0 });

      const newMessage: ChatMessage = {
        id: '1',
        gameCode: 'ABC123',
        playerId: 'p1',
        playerName: 'Alice',
        message: 'Hello',
        timestamp: Date.now(),
      };

      // Simulate what the listener does when chat is open
      useChatStore.setState((state) => ({
        messages: [...state.messages, newMessage],
        unreadCount: state.isOpen ? 0 : state.unreadCount + 1,
      }));

      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().unreadCount).toBe(0);
    });

    test('adding message to closed chat increments unread', () => {
      useChatStore.setState({ isOpen: false, unreadCount: 0 });

      const newMessage: ChatMessage = {
        id: '1',
        gameCode: 'ABC123',
        playerId: 'p1',
        playerName: 'Alice',
        message: 'Hello',
        timestamp: Date.now(),
      };

      // Simulate what the listener does when chat is closed
      useChatStore.setState((state) => ({
        messages: [...state.messages, newMessage],
        unreadCount: state.isOpen ? 0 : state.unreadCount + 1,
      }));

      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().unreadCount).toBe(1);
    });

    test('multiple messages to closed chat accumulate unread count', () => {
      useChatStore.setState({ isOpen: false, unreadCount: 0 });

      for (let i = 1; i <= 5; i++) {
        const msg: ChatMessage = {
          id: String(i),
          gameCode: 'ABC123',
          playerId: 'p1',
          playerName: 'Alice',
          message: `Message ${i}`,
          timestamp: Date.now(),
        };

        useChatStore.setState((state) => ({
          messages: [...state.messages, msg],
          unreadCount: state.isOpen ? 0 : state.unreadCount + 1,
        }));
      }

      expect(useChatStore.getState().messages).toHaveLength(5);
      expect(useChatStore.getState().unreadCount).toBe(5);
    });
  });

  describe('initChatListener', () => {
    test('registers listener with onChatMessage', () => {
      useChatStore.getState().initChatListener();
      expect(mockOnChatMessage).toHaveBeenCalledTimes(1);
      expect(typeof mockOnChatMessage.mock.calls[0][0]).toBe('function');
    });

    test('does not register duplicate listeners', () => {
      useChatStore.getState().initChatListener();
      useChatStore.getState().initChatListener();
      useChatStore.getState().initChatListener();
      expect(mockOnChatMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupChatListener', () => {
    test('calls unsubscribe function when cleaning up', () => {
      const unsubscribe = jest.fn();
      mockOnChatMessage.mockReturnValue(unsubscribe);

      useChatStore.getState().initChatListener();
      useChatStore.getState().cleanupChatListener();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    test('allows reinitializing listener after cleanup', () => {
      const unsubscribe = jest.fn();
      mockOnChatMessage.mockReturnValue(unsubscribe);

      useChatStore.getState().initChatListener();
      useChatStore.getState().cleanupChatListener();
      useChatStore.getState().initChatListener();

      expect(mockOnChatMessage).toHaveBeenCalledTimes(2);
    });
  });
});
