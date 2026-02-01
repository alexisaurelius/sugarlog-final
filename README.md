# SugarLog

A React Native mobile app built with Expo to help users track and reduce their sugar intake.

## Features

- **Home Dashboard**: View daily progress, streak, and motivational messages
- **Track Intake**: Log sugar consumption with quick-add items or custom amounts
- **Progress Tracking**: View weekly charts, success rates, and statistics
- **Goal Setting**: Set and adjust daily sugar intake goals
- **Data Persistence**: All data is stored locally using AsyncStorage

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Expo Go app on your device

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

Or use the dev script with tunnel mode (recommended for iPhone testing):
```bash
npm run dev
```

3. Connect to your iPhone:
   - Install the **Expo Go** app from the App Store on your iPhone
   - Make sure your iPhone and computer are on the same Wi-Fi network
   - When you run `npm run dev` or `npm start`, a QR code will appear in the terminal
   - Open the Expo Go app on your iPhone and scan the QR code
   - The app will load on your device

   **Note**: If you're using `npm run dev` (tunnel mode), you can connect even if devices are on different networks, but it may be slower.

4. Alternative: Run on iOS Simulator (Mac only):
```bash
npm run ios
```

## Project Structure

```
app/
  (tabs)/
    index.js      # Home/Dashboard screen
    track.js      # Sugar tracking screen
    progress.js   # Progress and statistics screen
  _layout.js      # Root layout with navigation
```

## Technologies Used

- React Native
- Expo
- Expo Router (file-based routing)
- AsyncStorage (data persistence)
- Expo Linear Gradient
- React Native Vector Icons

## License

MIT
