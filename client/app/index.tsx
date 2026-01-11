import { useState } from 'react';
import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from '../components/LoadingScreen';
import { WebLoadingScreen } from '../components/WebLoadingScreen';

export default function Index() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthed = useAuthStore((s) => Boolean(s.token && s.player));
  const [showSplash, setShowSplash] = useState(Platform.OS === 'web');

  // On web, show the animated splash screen first
  if (Platform.OS === 'web' && showSplash) {
    return <WebLoadingScreen onComplete={() => setShowSplash(false)} />;
  }

  if (!hasHydrated) {
    return Platform.OS === 'web' 
      ? <WebLoadingScreen /> 
      : <LoadingScreen backgroundColor="#fff" label="Restoring session…" />;
  }

  return <Redirect href={isAuthed ? '/(tabs)' : '/login'} />;
}

