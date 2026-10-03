import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './App';

// Development only. When the phone loses its hot-reload link to the PC (Metro was restarted, the PC's
// Wi-Fi IP changed, the phone slept) Expo shows "Cannot connect to Expo CLI". It only means live
// reload paused — the app keeps running, and reloading reconnects. Installed/release builds never show it.
LogBox.ignoreLogs(['Cannot connect to Expo CLI']);

registerRootComponent(App);
