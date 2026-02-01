/**
 * RevenueCat subscriptions and paywall.
 * Free tier: 3 distinct days with entries; on 4th day we show paywall.
 */
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

// Replace with your Google API key from RevenueCat dashboard when building for Android
const REVENUECAT_APPLE_API_KEY = 'appl_YfQJdRkadKzKnixGMOfYrLKrbfO';
const REVENUECAT_GOOGLE_API_KEY = ''; // Add goog_xxx from RevenueCat when ready for Android
const ENTITLEMENT_ID = 'pro';

let isConfigured = false;

export async function configurePurchases() {
  if (isConfigured) return;
  try {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: REVENUECAT_APPLE_API_KEY });
    } else if (Platform.OS === 'android' && REVENUECAT_GOOGLE_API_KEY) {
      Purchases.configure({ apiKey: REVENUECAT_GOOGLE_API_KEY });
    }
    isConfigured = true;
  } catch (e) {
    console.warn('RevenueCat configure:', e?.message || e);
  }
}

/**
 * Returns true if the user has active entitlement (e.g. pro subscription).
 */
export async function isSubscribed() {
  try {
    await configurePurchases();
    const customerInfo = await Purchases.getCustomerInfo();
    return typeof customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== 'undefined';
  } catch (e) {
    console.warn('RevenueCat getCustomerInfo:', e?.message || e);
    return false;
  }
}

/**
 * Present RevenueCat paywall. Returns true if user purchased or restored.
 */
export async function presentPaywall() {
  try {
    await configurePurchases();
    const result = await RevenueCatUI.presentPaywall();
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        return true;
      case PAYWALL_RESULT.CANCELLED:
      case PAYWALL_RESULT.NOT_PRESENTED:
      case PAYWALL_RESULT.ERROR:
      default:
        return false;
    }
  } catch (e) {
    console.warn('RevenueCat presentPaywall:', e?.message || e);
    return false;
  }
}

export { ENTITLEMENT_ID };
