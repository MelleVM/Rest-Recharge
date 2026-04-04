/**
 * @format
 */

console.log('[index.js] Starting app initialization');

import { AppRegistry } from 'react-native';
console.log('[index.js] AppRegistry imported');

import App from './App';
console.log('[index.js] App imported');

import { name as appName } from './app.json';
console.log('[index.js] appName:', appName);

import { configureNotifications } from './src/utils/initApp';
console.log('[index.js] configureNotifications imported');

// Configure notifications on app startup
configureNotifications();
console.log('[index.js] configureNotifications called');

AppRegistry.registerComponent(appName, () => App);
console.log('[index.js] AppRegistry.registerComponent called');
