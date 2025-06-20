/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Polyfill per buffer
global.Buffer = require('buffer').Buffer;

AppRegistry.registerComponent(appName, () => App);
