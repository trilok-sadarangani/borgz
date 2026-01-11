import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useAuthStore } from '../../store/authStore';

const isWeb = Platform.OS === 'web';

type Feature = {
  name: string;
  basic: string | boolean;
  plus: string | boolean;
};

const FEATURES: Feature[] = [
  { name: 'Create clubs', basic: '1 club', plus: 'Unlimited' },
  { name: 'Club members', basic: '6 max', plus: '50 max' },
  { name: 'Concurrent games', basic: '1 per club', plus: '5 per club' },
  { name: 'Game history', basic: '30 days', plus: 'Unlimited' },
  { name: 'Advanced statistics', basic: false, plus: true },
  { name: 'Position analysis', basic: false, plus: true },
  { name: 'Hand replayer', basic: false, plus: true },
  { name: 'Custom avatars', basic: false, plus: true },
  { name: 'Priority support', basic: false, plus: true },
  { name: 'Tournament mode', basic: false, plus: 'Coming soon' },
];

function CheckIcon() {
  return <Text style={{ color: '#22c55e', fontSize: 18 }}>✓</Text>;
}

function CrossIcon() {
  return <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>✗</Text>;
}

function renderFeatureValue(value: string | boolean, isPlus: boolean) {
  if (typeof value === 'boolean') {
    return value ? <CheckIcon /> : <CrossIcon />;
  }
  return (
    <Text style={[isWeb ? webStyles.featureValue : styles.featureValue, isPlus && (isWeb ? webStyles.featureValuePlus : styles.featureValuePlus)]}>
      {value}
    </Text>
  );
}

export default function PlusScreen() {
  const { token, player } = useAuthStore();
  const s = isWeb ? webStyles : styles;

  return (
    <ScrollView style={s.scrollContainer} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.title}>borgz Plus</Text>
        <Text style={s.subtitle}>Upgrade your poker experience</Text>
      </View>

      {/* Pricing Cards */}
      <View style={s.pricingContainer}>
        {/* Basic Plan */}
        <View style={s.pricingCard}>
          <View style={s.planHeader}>
            <Text style={s.planName}>Basic</Text>
            <Text style={s.planDescription}>For casual players</Text>
          </View>
          <View style={s.priceContainer}>
            <Text style={s.priceAmount}>$0</Text>
            <Text style={s.pricePeriod}>/month</Text>
          </View>
          <View style={s.planFeatures}>
            <Text style={s.planFeatureItem}>• 1 club</Text>
            <Text style={s.planFeatureItem}>• Up to 6 members</Text>
            <Text style={s.planFeatureItem}>• 30-day history</Text>
            <Text style={s.planFeatureItem}>• Basic statistics</Text>
          </View>
          <Pressable style={s.planButtonBasic}>
            <Text style={s.planButtonTextBasic}>Current Plan</Text>
          </Pressable>
        </View>

        {/* Plus Plan */}
        <View style={[s.pricingCard, s.pricingCardPlus]}>
          <View style={s.popularBadge}>
            <Text style={s.popularBadgeText}>POPULAR</Text>
          </View>
          <View style={s.planHeader}>
            <Text style={[s.planName, s.planNamePlus]}>Plus</Text>
            <Text style={[s.planDescription, s.planDescriptionPlus]}>For serious players</Text>
          </View>
          <View style={s.priceContainer}>
            <Text style={[s.priceAmount, s.priceAmountPlus]}>$9.99</Text>
            <Text style={[s.pricePeriod, s.pricePeriodPlus]}>/month</Text>
          </View>
          <View style={s.planFeatures}>
            <Text style={[s.planFeatureItem, s.planFeatureItemPlus]}>• Unlimited clubs</Text>
            <Text style={[s.planFeatureItem, s.planFeatureItemPlus]}>• Up to 50 members</Text>
            <Text style={[s.planFeatureItem, s.planFeatureItemPlus]}>• Unlimited history</Text>
            <Text style={[s.planFeatureItem, s.planFeatureItemPlus]}>• Advanced analytics</Text>
            <Text style={[s.planFeatureItem, s.planFeatureItemPlus]}>• Hand replayer</Text>
          </View>
          <Pressable style={s.planButtonPlus}>
            <Text style={s.planButtonTextPlus}>Upgrade to Plus</Text>
          </Pressable>
        </View>
      </View>

      {/* Feature Comparison Table */}
      <View style={s.comparisonCard}>
        <Text style={s.comparisonTitle}>Feature Comparison</Text>
        
        {/* Table Header */}
        <View style={s.tableHeader}>
          <View style={s.tableFeatureCol}>
            <Text style={s.tableHeaderText}>Feature</Text>
          </View>
          <View style={s.tablePlanCol}>
            <Text style={s.tableHeaderText}>Basic</Text>
          </View>
          <View style={s.tablePlanCol}>
            <Text style={[s.tableHeaderText, s.tableHeaderPlus]}>Plus</Text>
          </View>
        </View>

        {/* Table Rows */}
        {FEATURES.map((feature, idx) => (
          <View key={feature.name} style={[s.tableRow, idx % 2 === 0 && s.tableRowAlt]}>
            <View style={s.tableFeatureCol}>
              <Text style={s.featureName}>{feature.name}</Text>
            </View>
            <View style={s.tablePlanCol}>
              {renderFeatureValue(feature.basic, false)}
            </View>
            <View style={s.tablePlanCol}>
              {renderFeatureValue(feature.plus, true)}
            </View>
          </View>
        ))}
      </View>

      {/* FAQ Section */}
      <View style={s.faqCard}>
        <Text style={s.faqTitle}>Frequently Asked Questions</Text>
        
        <View style={s.faqItem}>
          <Text style={s.faqQuestion}>Can I cancel anytime?</Text>
          <Text style={s.faqAnswer}>Yes, you can cancel your Plus subscription at any time. You'll continue to have access until the end of your billing period.</Text>
        </View>
        
        <View style={s.faqItem}>
          <Text style={s.faqQuestion}>What happens to my data if I downgrade?</Text>
          <Text style={s.faqAnswer}>Your clubs and game history will remain, but older history beyond 30 days will no longer be accessible until you upgrade again.</Text>
        </View>
        
        <View style={s.faqItem}>
          <Text style={s.faqQuestion}>Is there a yearly plan?</Text>
          <Text style={s.faqAnswer}>Yes! Save 20% with our yearly plan at $95.88/year (equivalent to $7.99/month).</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Web styles - dark theme
const webStyles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    padding: 48,
    paddingTop: 32,
    alignItems: 'center',
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    marginBottom: 12,
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
  },
  pricingContainer: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 48,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pricingCard: {
    width: 320,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 32,
    position: 'relative',
  },
  pricingCardPlus: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 24,
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  planHeader: {
    marginBottom: 24,
  },
  planName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  planNamePlus: {
    color: '#22c55e',
  },
  planDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  planDescriptionPlus: {
    color: 'rgba(34, 197, 94, 0.8)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
  },
  priceAmountPlus: {
    color: '#22c55e',
  },
  pricePeriod: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 4,
  },
  pricePeriodPlus: {
    color: 'rgba(34, 197, 94, 0.7)',
  },
  planFeatures: {
    marginBottom: 24,
    gap: 12,
  },
  planFeatureItem: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  planFeatureItemPlus: {
    color: 'rgba(255,255,255,0.9)',
  },
  planButtonBasic: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  planButtonTextBasic: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    fontSize: 15,
  },
  planButtonPlus: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#22c55e',
  },
  planButtonTextPlus: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  comparisonCard: {
    width: '100%',
    maxWidth: 700,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 32,
    marginBottom: 48,
  },
  comparisonTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tableFeatureCol: {
    flex: 2,
  },
  tablePlanCol: {
    flex: 1,
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableHeaderPlus: {
    color: '#22c55e',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  featureName: {
    fontSize: 15,
    color: '#fff',
  },
  featureValue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  featureValuePlus: {
    color: '#22c55e',
    fontWeight: '600',
  },
  faqCard: {
    width: '100%',
    maxWidth: 700,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 32,
  },
  faqTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  faqItem: {
    marginBottom: 24,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 24,
  },
});

// Native styles - light theme
const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 16,
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  pricingContainer: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
    width: '100%',
  },
  pricingCard: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 16,
    padding: 24,
    position: 'relative',
  },
  pricingCardPlus: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 2,
  },
  planNamePlus: {
    color: '#22c55e',
  },
  planDescription: {
    fontSize: 13,
    color: '#666',
  },
  planDescriptionPlus: {
    color: '#16a34a',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#111',
  },
  priceAmountPlus: {
    color: '#22c55e',
  },
  pricePeriod: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  pricePeriodPlus: {
    color: '#16a34a',
  },
  planFeatures: {
    marginBottom: 16,
    gap: 8,
  },
  planFeatureItem: {
    fontSize: 14,
    color: '#555',
  },
  planFeatureItemPlus: {
    color: '#333',
  },
  planButtonBasic: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  planButtonTextBasic: {
    color: '#666',
    fontWeight: '700',
    fontSize: 14,
  },
  planButtonPlus: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#22c55e',
  },
  planButtonTextPlus: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  comparisonCard: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 16,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e5e5',
  },
  tableFeatureCol: {
    flex: 2,
  },
  tablePlanCol: {
    flex: 1,
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableHeaderPlus: {
    color: '#22c55e',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  featureName: {
    fontSize: 14,
    color: '#333',
  },
  featureValue: {
    fontSize: 13,
    color: '#666',
  },
  featureValuePlus: {
    color: '#22c55e',
    fontWeight: '600',
  },
  faqCard: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 16,
    padding: 16,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 16,
    textAlign: 'center',
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
