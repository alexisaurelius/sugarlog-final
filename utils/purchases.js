/**
 * RevenueCat subscriptions and paywall.
 * Free tier: 2 distinct days with entries; on 3rd new day we show paywall.
 */
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { REVENUECAT, SUBSCRIPTION } from '../app.config';

let isConfigured = false;
let configurePromise = null;
let warmUpPromise = null;
let pendingPaywallPromise = null;

export async function configurePurchases() {
  if (isConfigured) return;
  if (configurePromise) {
    await configurePromise;
    return;
  }

  configurePromise = (async () => {
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
      throw e;
    } finally {
      configurePromise = null;
    }
  })();

  await configurePromise;
}

/**
 * Configure RevenueCat and prefetch offerings so the paywall has products ready.
 * Call early in app launch and when the premium onboarding screen mounts.
 */
export async function warmUpPurchases() {
  if (Platform.OS === 'web') return;
  if (warmUpPromise) {
    await warmUpPromise;
    return;
  }

  warmUpPromise = (async () => {
    try {
      await configurePurchases();
      await fetchCurrentOffering();
    } catch (e) {
      console.warn('RevenueCat warmUp:', e?.message || e);
    } finally {
      warmUpPromise = null;
    }
  })();

  await warmUpPromise;
}

async function fetchCurrentOffering(maxAttempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings?.current) {
        return offerings.current;
      }
      lastError = new Error('No current offering configured in RevenueCat');
    } catch (e) {
      lastError = e;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  throw lastError;
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
  if (Platform.OS === 'web') return false;

  if (pendingPaywallPromise) {
    return pendingPaywallPromise;
  }

  pendingPaywallPromise = (async () => {
    try {
      await warmUpPurchases();
      const offering = await fetchCurrentOffering();
      const result = await RevenueCatUI.presentPaywall({ offering });
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
    } finally {
      pendingPaywallPromise = null;
    }
  })();

  return pendingPaywallPromise;
}
