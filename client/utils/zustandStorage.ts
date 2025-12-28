import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

function createWebStorage(): StateStorage {
  return {
    getItem: async (name) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ls = (globalThis as any)?.localStorage as Storage | undefined;
        if (!ls) return null;
        return ls.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ls = (globalThis as any)?.localStorage as Storage | undefined;
        if (!ls) return;
        ls.setItem(name, value);
      } catch {
        // ignore
      }
    },
    removeItem: async (name) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ls = (globalThis as any)?.localStorage as Storage | undefined;
        if (!ls) return;
        ls.removeItem(name);
      } catch {
        // ignore
      }
    },
  };
}

function createNativeAsyncStorage(): StateStorage {
  // Keep this as a runtime `require` so tests (and some web bundlers) don't choke on it.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-async-storage/async-storage');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AsyncStorage = (mod?.default || mod) as any;

  return {
    getItem: (name) => AsyncStorage.getItem(name),
    setItem: (name, value) => AsyncStorage.setItem(name, value),
    removeItem: (name) => AsyncStorage.removeItem(name),
  };
}

export function createUniversalZustandStorage(): StateStorage {
  return Platform.OS === 'web' ? createWebStorage() : createNativeAsyncStorage();
}


