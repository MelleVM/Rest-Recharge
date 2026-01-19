# RechargeRest

A React Native app designed to help people with low energy levels manage their day and take regular eye rests.

## Features

- **Wake-up Time Logging**: Log when you wake up to start your day
- **Automatic Reminders**: Receive notifications every two hours to take a 20-minute eye rest
- **Built-in Timer**: Use the timer feature to track your 20-minute eye rest periods
- **Progress Dashboard**: View statistics on your wake-up times and completed rest periods
- **Clean, Modern UI**: Easy-to-use interface designed for accessibility and simplicity

## Purpose

RechargeRest is specifically designed for individuals with low energy levels who need to:
- Track their daily wake-up times
- Take regular breaks to rest their eyes
- Maintain a consistent rest schedule throughout the day

## Getting Started

### Prerequisites

- Node.js
- Yarn
- React Native development environment set up
- iOS or Android device/emulator

### Installation

1. Clone the repository
2. Install dependencies:
```sh
yarn install
```

3. For iOS, install CocoaPods dependencies:
```sh
cd ios && pod install && cd ..
```

### Running the App

```sh
# Start Metro bundler
yarn start

# Run on iOS
yarn ios

# Run on Android
yarn android
```

## App Structure

- **Home Screen**: Log your wake-up time and view your next scheduled rest
- **Timer Screen**: 20-minute countdown timer for eye rest periods
- **Settings Screen**: Configure notification preferences and app settings

## Technologies Used

- React Native
- React Navigation
- React Native Paper (UI components)
- AsyncStorage (local data persistence)
- Push Notifications

## License

This project is licensed under the MIT License.
