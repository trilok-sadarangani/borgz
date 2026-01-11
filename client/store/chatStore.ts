import { create } from 'zustand';
import { ChatMessage } from '../../shared/types/game.types';
import {
  sendChatMessage as socketSendChatMessage,
  onChatMessage,
} from '../services/socket';

interface ChatStoreState {
  messages: ChatMessage[];
  isOpen: boolean;
  unreadCount: number;

  // Lifecycle
  initChatListener: () => void;
  cleanupChatListener: () => void;

  // Actions
  sendMessage: (message: string) => void;
  clearMessages: () => void;
  toggleChat: () => void;
  setOpen: (isOpen: boolean) => void;
  markAsRead: () => void;
}

let unsubscribeChatMessage: null | (() => void) = null;

export const useChatStore = create<ChatStoreState>((set, get) => ({
  messages: [],
  isOpen: false,
  unreadCount: 0,

  initChatListener: () => {
    if (!unsubscribeChatMessage) {
      unsubscribeChatMessage = onChatMessage((message) => {
        set((state) => ({
          messages: [...state.messages, message],
          // Increment unread count only if chat is closed
          unreadCount: state.isOpen ? 0 : state.unreadCount + 1,
        }));
      });
    }
  },

  cleanupChatListener: () => {
    if (unsubscribeChatMessage) {
      unsubscribeChatMessage();
      unsubscribeChatMessage = null;
    }
  },

  sendMessage: (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    socketSendChatMessage(trimmed);
  },

  clearMessages: () => {
    set({ messages: [], unreadCount: 0 });
  },

  toggleChat: () => {
    set((state) => ({
      isOpen: !state.isOpen,
      unreadCount: !state.isOpen ? 0 : state.unreadCount,
    }));
  },

  setOpen: (isOpen: boolean) => {
    set({ isOpen, unreadCount: isOpen ? 0 : get().unreadCount });
  },

  markAsRead: () => {
    set({ unreadCount: 0 });
  },
}));
