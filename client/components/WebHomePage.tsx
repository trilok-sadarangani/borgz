import { useState, ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import Aurora from './Aurora';

function UserDropdown({ onLogout, onProfile }: { onLogout: () => void; onProfile: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const player = useAuthStore((s) => s.player);

  return (
    <View style={styles.dropdownContainer}>
      <Pressable 
        style={styles.avatar} 
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.avatarText}>
          {player?.name?.charAt(0).toUpperCase() || 'U'}
        </Text>
      </Pressable>
      
      {isOpen && (
        <>
          <Pressable style={styles.dropdownOverlay} onPress={() => setIsOpen(false)} />
          <View style={styles.dropdown}>
            <Pressable style={styles.dropdownItem} onPress={() => { setIsOpen(false); onProfile(); }}>
              <Text style={styles.dropdownText}>Profile</Text>
            </Pressable>
            <View style={styles.dropdownDivider} />
            <Pressable style={styles.dropdownItem} onPress={() => { setIsOpen(false); onLogout(); }}>
              <Text style={[styles.dropdownText, styles.logoutText]}>Logout</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

type WebHomePageProps = {
  children?: ReactNode;
};

export function WebHomePage({ children }: WebHomePageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  // Check if we're on the home/index page
  const isHomePage = pathname === '/(tabs)' || pathname === '/';

  return (
    <View style={styles.container}>
      {/* Aurora background */}
      {Platform.OS === 'web' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#0a0a0a', zIndex: 0 }}>
          <Aurora
            colorStops={["#6b3c72", "#ae9bee", "#3729ff"]}
            blend={0.5}
            amplitude={1.0}
            speed={1}
          />
        </div>
      )}
      
      {/* Only show navbar if NOT on home page */}
      {!isHomePage && (
        <View style={styles.navbar}>
          {/* Back to home */}
          <Pressable onPress={() => router.push('/(tabs)')}>
            <Text style={styles.logo}>← borgz</Text>
          </Pressable>

          {/* User Avatar - Right */}
          <UserDropdown onLogout={handleLogout} onProfile={() => router.push('/(tabs)/profile')} />
        </View>
      )}

      {/* Main Content Area */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 100,
  },
  logo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  navMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navItem: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  navTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dropdownContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  dropdownOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 160,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    zIndex: 100,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    } : {}),
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  logoutText: {
    color: '#ef4444',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
