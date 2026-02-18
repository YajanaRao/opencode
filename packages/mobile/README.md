# OpenCode Mobile (Android)

A React Native / Expo app for connecting to OpenCode servers from your Android phone.

**Note:** This app is currently configured for Android only. iOS and web platforms are not supported in this build.

## Features

- **Multiple Connection Types**: Connect via local network, tunnels (Cloudflare/ngrok), or cloud-hosted instances
- **Secure Authentication**: Biometric authentication support (fingerprint/face unlock on Android)
- **Session Management**: View, create, and manage coding sessions
- **Real-time Chat**: Stream responses from your AI assistant
- **File Diff Viewer**: See what changes were made to your code

## Getting Started

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm
- Android device or emulator for testing

### Installation

```bash
# From the monorepo root
cd packages/mobile
bun install

# Start the development server
bun start
```

### Connecting to OpenCode

1. Start OpenCode in server mode on your machine:

   ```bash
   OPENCODE_SERVER_PASSWORD=yourpassword opencode serve --hostname 0.0.0.0 --port 4096
   ```

2. Open the app and add a connection:
   - **Local Network**: Use your machine's local IP (e.g., `http://192.168.1.100:4096`)
   - **Tunnel**: Set up a Cloudflare Tunnel or ngrok and use the tunnel URL
   - **Cloud**: Connect to a hosted OpenCode instance

## Building for Android

### GitHub Actions (Automated)

The repository includes a GitHub Actions workflow that automatically builds Android APKs:

- **Trigger**: Pushes to `feat/mobile-app` branch or manually via workflow dispatch
- **Output**: APK artifact available for download from the workflow run
- **Location**: `.github/workflows/build-mobile-apk.yml`

The workflow:
1. Sets up the build environment (Bun, Java, Android SDK, Expo)
2. Installs dependencies
3. Runs `expo prebuild --platform android` to generate native Android project
4. Builds the release APK using Gradle
5. Uploads the APK as a workflow artifact

**Note:** This workflow builds Android only. iOS and web platforms are not included.

### Local Android Build

Run the app on Android:

```bash
bun run android
# or use EAS Build
eas build --platform android
```

### Manual Android APK Build

If you want to build the APK locally:

```bash
# Generate the native Android project
npx expo prebuild --platform android --clean

# Build the APK
cd android
./gradlew assembleRelease

# The APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

## Security

- Credentials are stored securely using `expo-secure-store` (Android Keystore)
- Optional biometric authentication for app access (fingerprint/face unlock)
- Optional biometric confirmation for sending messages
- All traffic should use HTTPS for non-local connections

## Architecture

```
packages/mobile/
├── app/                  # Expo Router screens
│   ├── (tabs)/          # Tab navigation
│   ├── session/         # Session screens
│   └── connection/      # Connection management
├── src/
│   ├── components/      # Reusable components
│   ├── hooks/           # Custom hooks
│   ├── lib/             # SDK client & types
│   └── stores/          # Zustand state stores
└── assets/              # App icons & images
```

## Contributing

This is part of the OpenCode monorepo. See the root README for contribution guidelines.
