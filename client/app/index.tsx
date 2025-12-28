import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { FullScreenLoader } from '../components/FullScreenLoader';

export default function Index() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthed = useAuthStore((s) => Boolean(s.token && s.player));
  if (!hasHydrated) return <FullScreenLoader label="Restoring session…" />;
  return <Redirect href={isAuthed ? '/(tabs)' : '/login'} />;
}

