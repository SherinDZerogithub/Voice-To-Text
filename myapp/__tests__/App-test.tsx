/**
 * @format
 */

import 'react-native';
import React from 'react';

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('@react-native-voice/voice', () => ({
  isAvailable: jest.fn(() => Promise.resolve(true)),
  getSpeechRecognitionServices: jest.fn(() =>
    Promise.resolve(['mock-service']),
  ),
  destroy: jest.fn(() => Promise.resolve()),
  removeAllListeners: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-tts', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const MockReact = require('react');
  const {Text} = require('react-native');
  return ({name}: {name?: string}) => MockReact.createElement(Text, null, name);
});

import App from '../App';

// Note: test renderer must be required after react-native.
import renderer, {act} from 'react-test-renderer';

it('renders correctly', async () => {
  let tree: renderer.ReactTestRenderer;

  await act(async () => {
    tree = renderer.create(<App />);
    await Promise.resolve();
  });

  await act(async () => {
    tree.unmount();
    await Promise.resolve();
  });
});
