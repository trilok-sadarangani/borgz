import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

// IMPORTANT: Must be called at the top level before any component renders.
// This closes the Auth0 popup after login completes and returns the token to the opener window.
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="loading" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

