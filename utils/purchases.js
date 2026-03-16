/**
 * RevenueCat subscriptions and paywall.
 * Free tier: 3 distinct days with entries; on 4th day we show paywall.
 */
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { REVENUECAT, SUBSCRIPTION } from '../app.config';

let isConfigured = false;

export async function configurePurchases() {
  if (isConfigured) return;
  try {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: REVENUECAT.appleApiKey });
    } else if (Platform.OS === 'android' && REVENUECAT.googleApiKey) {
      Purchases.configure({ apiKey: REVENUECAT.googleApiKey });
    }
    isConfigured = true;
  } catch (e) {
    console.warn('RevenueCat configure:', e?.message || e);
  }
}

/**
 * Returns true if the user has active entitlement (e.g. pro/premium subscription).
 * Checks SUBSCRIPTION.entitlementIds so RevenueCat dashboard can use "pro" or "premium".
 * @param {boolean} [forceRefresh=false] If true, invalidates cache first so the next getCustomerInfo fetches from server (use before showing paywall to avoid paid users seeing it again).
 */
export async function isSubscribed(forceRefresh = false) {
  try {
    await configurePurchases();
    if (forceRefresh) {
      await Purchases.invalidateCustomerInfoCache();
    }
    const customerInfo = await Purchases.getCustomerInfo();
    const active = customerInfo?.entitlements?.active ?? {};
    const ids = SUBSCRIPTION.entitlementIds || [SUBSCRIPTION.entitlementId];
    const hasEntitlement = ids.some((id) => typeof active[id] !== 'undefined');
    if (hasEntitlement) return true;
    // Fallback: any active entitlement counts (avoids blocking if dashboard uses a different ID)
    if (Object.keys(active).length > 0) return true;
    return false;
  } catch (e) {
    console.warn('RevenueCat getCustomerInfo:', e?.message || e);
    return false;
  }
}

/**
 * Returns the URL to manage this app's subscription (App Store / Play Store).
 * Use this for "Manage Subscription" so the user sees this app's subscription, not the generic list.
 * @returns {Promise<string|null>} URL or null if not available
 */
export async function getSubscriptionManagementURL() {
  try {
    await configurePurchases();
    const customerInfo = await Purchases.getCustomerInfo();
    const url = customerInfo?.managementURL ?? null;
    return typeof url === 'string' && url.length > 0 ? url : null;
  } catch (e) {
    console.warn('RevenueCat getManagementURL:', e?.message || e);
    return null;
  }
}

/**
 * Restore purchases from the store (Apple ID / Google account).
 * Links the current app user to any existing subscription so that after reinstall
 * or new device, premium is recognized. Call only from user action (e.g. "Restore" button).
 * @returns {{ restored: boolean }} restored: true if an active entitlement was found after restore.
 */
export async function restorePurchases() {
  try {
    await configurePurchases();
    await Purchases.restorePurchases();
    await Purchases.invalidateCustomerInfoCache();
    const hasEntitlement = await isSubscribed(true);
    return { restored: hasEntitlement };
  } catch (e) {
    console.warn('RevenueCat restorePurchases:', e?.message || e);
    return { restored: false };
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
