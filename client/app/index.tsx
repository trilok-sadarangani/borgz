import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const isAuthed = useAuthStore((s) => Boolean(s.token && s.player));
  return <Redirect href={isAuthed ? '/(tabs)' : '/login'} />;
}

