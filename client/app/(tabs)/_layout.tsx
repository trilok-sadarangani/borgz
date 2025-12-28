import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function TabsLayout() {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <Redirect href="/login" />;
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
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

