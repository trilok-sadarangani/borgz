import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, Easing } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { getAuth0Config } from '../services/runtimeConfig';
import { explainAuth0Failure } from '../../shared/auth0Diagnostics';
import { LoadingScreen } from '../components/LoadingScreen';
import { LoadingSpinner } from '../components/LoadingSpinner';
import Aurora from '../components/Aurora';

WebBrowser.maybeCompleteAuthSession();

// Animated background component with slowly shifting colors
function AnimatedBackground() {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(animation, {
        toValue: 1,
        duration: 20000, // 20 seconds for full cycle
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [animation]);

  // Interpolate through soft pastel colors
  const backgroundColor = animation.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [
      '#f0fdf4', // soft mint
      '#ecfeff', // soft cyan
      '#f0f9ff', // soft sky
      '#faf5ff', // soft purple
      '#fff1f2', // soft rose
      '#f0fdf4', // back to mint
    ],
  });

  const glow1Color = animation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      'rgba(34, 197, 94, 0.15)',   // green
      'rgba(6, 182, 212, 0.15)',   // cyan
      'rgba(139, 92, 246, 0.15)',  // violet
      'rgba(236, 72, 153, 0.15)',  // pink
      'rgba(34, 197, 94, 0.15)',   // back to green
    ],
  });

  const glow2Color = animation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      'rgba(168, 85, 247, 0.12)',  // purple
      'rgba(34, 197, 94, 0.12)',   // green
      'rgba(6, 182, 212, 0.12)',   // cyan
      'rgba(139, 92, 246, 0.12)',  // violet
      'rgba(168, 85, 247, 0.12)',  // back to purple
    ],
  });

  // For web, use the Aurora WebGL component for a stunning effect
  if (Platform.OS === 'web') {
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#0a0a0a' }}>
        <Aurora
          colorStops={["#6b3c72", "#ae9bee", "#3729ff"]}
          blend={0.5}
          amplitude={1.0}
          speed={1}
        />
      </div>
    );
  }

  // For native, use Animated
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor }]} />
      <Animated.View
        style={[
          styles.backgroundGlow,
          { backgroundColor: glow1Color },
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundGlowSecondary,
          { backgroundColor: glow2Color },
        ]}
      />
    </>
  );
}

// Icons as simple text components for now
function GoogleIcon() {
  return (
    <View style={iconStyles.googleIcon}>
      <Text style={iconStyles.googleG}>G</Text>
    </View>
  );
}

function AppleIcon() {
  return (
    <View style={iconStyles.appleIcon}>
      <Text style={iconStyles.appleLogo}></Text>
    </View>
  );
}

function EmailIcon() {
  return (
    <View style={iconStyles.emailIcon}>
      <Text style={iconStyles.emailSymbol}>✉</Text>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4285F4',
  },
  appleIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleLogo: {
    fontSize: 18,
    color: '#fff',
    marginTop: -2,
  },
  emailIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailSymbol: {
    fontSize: 14,
    color: '#666',
  },
});

export default function LoginScreen() {
  const { token, player, loading, error, loginWithAuth0AccessToken, clearError } = useAuthStore();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [auth0Error, setAuth0Error] = useState<string | null>(null);

  const { domain: auth0Domain, clientId: auth0ClientId, audience: auth0Audience } = getAuth0Config();

  const discovery = AuthSession.useAutoDiscovery(auth0Domain ? `https://${auth0Domain}` : '');
  const redirectUri = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isWeb = typeof (globalThis as any)?.document !== 'undefined';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origin = (globalThis as any)?.location?.origin as string | undefined;
    if (isWeb && origin) return origin;
    return AuthSession.makeRedirectUri({ scheme: 'borgz' });
  }, []);

  // Google Auth Request
  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: auth0ClientId || '',
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      scopes: ['openid', 'profile', 'email'],
      extraParams: {
        ...(auth0Audience ? { audience: auth0Audience } : null),
        connection: 'google-oauth2',
        prompt: 'login',
      },
    },
    discovery
  );

  // Apple Auth Request
  const [appleRequest, appleResponse, promptAppleAsync] = AuthSession.useAuthRequest(
    {
      clientId: auth0ClientId || '',
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      scopes: ['openid', 'profile', 'email'],
      extraParams: {
        ...(auth0Audience ? { audience: auth0Audience } : null),
        connection: 'apple',
        prompt: 'login',
      },
    },
    discovery
  );

  // Generic Auth0 (email/password or other)
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: auth0ClientId || '',
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      scopes: ['openid', 'profile', 'email'],
      extraParams: {
        ...(auth0Audience ? { audience: auth0Audience } : null),
        prompt: 'login',
        ...(mode === 'signup' ? { screen_hint: 'signup' } : {}),
      },
    },
    discovery
  );

  // If already authenticated, redirect to main app (handled below with <Redirect>)

  // Handle all auth responses
  useEffect(() => {
    const responses = [googleResponse, appleResponse, response];
    for (const res of responses) {
      if (res?.type === 'success') {
        const accessToken = (res.params as any)?.access_token as string | undefined;
        if (accessToken) {
          void loginWithAuth0AccessToken(accessToken);
          return;
        }
      }
    }
  }, [googleResponse, appleResponse, response, loginWithAuth0AccessToken]);

  useEffect(() => {
    const responses = [googleResponse, appleResponse, response];
    for (const res of responses) {
      const msg = explainAuth0Failure(res as any, { domain: auth0Domain, clientId: auth0ClientId, audience: auth0Audience }, { redirectUri });
      if (msg) {
        setAuth0Error(msg);
        return;
      }
    }
  }, [googleResponse, appleResponse, response, auth0Domain, auth0ClientId, auth0Audience, redirectUri]);

  if (!hasHydrated || loading) {
    return Platform.OS === 'web' 
      ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" label="Loading..." light={false} />
        </View>
      )
      : <LoadingScreen backgroundColor="#fff" />;
  }

  // If already authenticated, redirect to main app
  if (token && player) {
    return <Redirect href="/(tabs)" />;
  }

  const isAuth0Ready = googleRequest && discovery && auth0Domain && auth0ClientId;

  return (
    <View style={styles.container}>
      {/* Animated background with slowly shifting colors */}
      <AnimatedBackground />
      
      <View style={styles.card}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>borgz</Text>
          <Text style={styles.tagline}>Play poker with friends</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'login' 
            ? 'Sign in to continue to borgz' 
            : 'Get started with borgz today'}
        </Text>

        {/* Error messages */}
        {(error || auth0Error) && (
          <Pressable 
            onPress={() => { clearError(); setAuth0Error(null); }}
            style={styles.errorContainer}
          >
            <Text style={styles.errorText}>{error || auth0Error}</Text>
            <Text style={styles.errorDismiss}>Tap to dismiss</Text>
          </Pressable>
        )}

        {/* Auth Buttons */}
        <View style={styles.authButtons}>
          {/* Google Button */}
          <Pressable
            style={({ pressed }) => [
              styles.authButton,
              styles.googleButton,
              pressed && styles.authButtonPressed,
              !isAuth0Ready && styles.authButtonDisabled,
            ]}
            disabled={!isAuth0Ready || loading}
            onPress={() => {
              setAuth0Error(null);
              void promptGoogleAsync();
            }}
          >
            <GoogleIcon />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>

          {/* Apple Button */}
          <Pressable
            style={({ pressed }) => [
              styles.authButton,
              styles.appleButton,
              pressed && styles.authButtonPressed,
              !isAuth0Ready && styles.authButtonDisabled,
            ]}
            disabled={!isAuth0Ready || loading}
            onPress={() => {
              setAuth0Error(null);
              void promptAppleAsync();
            }}
          >
            <AppleIcon />
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Button (goes to Auth0 Universal Login) */}
          <Pressable
            style={({ pressed }) => [
              styles.authButton,
              styles.emailButton,
              pressed && styles.authButtonPressed,
              !isAuth0Ready && styles.authButtonDisabled,
            ]}
            disabled={!isAuth0Ready || loading}
            onPress={() => {
              setAuth0Error(null);
              void promptAsync();
            }}
          >
            <EmailIcon />
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </Pressable>
        </View>

        {/* Toggle Login/Signup */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleText}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          </Text>
          <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            <Text style={styles.toggleLink}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </Text>
          </Pressable>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 borgz</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    overflow: 'hidden',
  },
  backgroundGlow: {
    position: 'absolute',
    top: '10%',
    left: '20%',
    width: 500,
    height: 500,
    borderRadius: 250,
  },
  backgroundGlowSecondary: {
    position: 'absolute',
    bottom: '10%',
    right: '20%',
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 8,
    }),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
  },
  errorDismiss: {
    color: '#dc2626',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  authButtons: {
    gap: 12,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 12,
  },
  authButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  authButtonDisabled: {
    opacity: 0.5,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  appleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#999',
  },
  emailButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  emailButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  terms: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  termsLink: {
    color: '#666',
    textDecorationLine: 'underline',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
