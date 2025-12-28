import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function FullScreenLoader(props: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator />
      <Text style={styles.text}>{props.label || 'Loading…'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  text: { color: '#666', fontSize: 14, fontWeight: '600' },
});


