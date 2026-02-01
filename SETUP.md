# Quick Setup Guide for iPhone Testing

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Install Expo Go on Your iPhone
- Open the App Store on your iPhone
- Search for "Expo Go" and install it

## Step 3: Start the Development Server
In the terminal, run:
```bash
npm run dev
```

This will:
- Start the Expo development server
- Display a QR code in your terminal
- Show connection options

**Note**: If you're on the same Wi-Fi network, use `npm run dev`. If devices are on different networks, use `npm run dev:tunnel` instead.

## Step 4: Connect Your iPhone
1. Open the **Expo Go** app on your iPhone
2. Tap "Scan QR Code" 
3. Point your camera at the QR code in the terminal
4. The app will automatically load on your device

## Troubleshooting

### If QR code doesn't work:
- Make sure both devices are on the same Wi-Fi network
- Try using `npm start` instead (LAN mode) if on same network
- Use `npm run dev` (tunnel mode) if on different networks

### If connection fails:
- Check your firewall settings
- Ensure port 19000-19001 are not blocked
- Try restarting the development server

### Alternative Connection Methods:
After running `npm run dev`, you can also:
- Press `i` in the terminal to open in iOS Simulator (Mac only)
- Enter the connection URL manually in Expo Go app

## Development Tips
- The app will automatically reload when you save changes
- Shake your device to open the developer menu
- Check the terminal for any error messages
