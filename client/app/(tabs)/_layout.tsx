import { Platform } from 'react-native';
import { Redirect, Tabs, Slot } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { LoadingScreen } from '../../components/LoadingScreen';
import { WebHomePage } from '../../components/WebHomePage';

export default function TabsLayout() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);

  if (!hasHydrated) return <LoadingScreen backgroundColor="#fff" label="Restoring session…" />;
  if (!token) {
    return <Redirect href="/login" />;
  }

  // On web, wrap content in WebHomePage layout
  if (Platform.OS === 'web') {
    return (
      <WebHomePage>
        <Slot />
      </WebHomePage>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lobby',
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: 'Game',
        }}
      />
      <Tabs.Screen
        name="clubs"
        options={{
          title: 'Clubs',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Games & Stats',
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: 'Plus',
        }}
      />
    </Tabs>
  );
}

