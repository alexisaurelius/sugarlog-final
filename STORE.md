# App Store / distribution metadata

For future reference (submissions, links, support).

| Field     | Value            |
|----------|-------------------|
| **Apple ID**  | 6758400714        |
| **Bundle ID** | com.sugarlog.app  |

## RevenueCat

- **Apple API key:** `appl_YfQJdRkadKzKnixGMOfYrLKrbfO` (configured in `utils/purchases.js`)
- **Entitlement ID:** `pro` (create in RevenueCat dashboard and attach products)
- **Android:** Add Google API key (`goog_xxx`) in RevenueCat dashboard and set `REVENUECAT_GOOGLE_API_KEY` in `utils/purchases.js` when building for Android.
- **Free tier:** Users can log sugar on 3 different days (unlimited entries per day); on 4th day the paywall is presented.
