import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from '../components/LoadingScreen';

export default function Index() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthed = useAuthStore((s) => Boolean(s.token && s.player));
  if (!hasHydrated) return <LoadingScreen backgroundColor="#fff" label="Restoring session…" />;
  return <Redirect href={isAuthed ? '/(tabs)' : '/login'} />;
}

