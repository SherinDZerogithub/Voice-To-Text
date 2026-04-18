import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  View,
  StyleSheet,
  PermissionsAndroid,
  Text,
  NativeModules,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

// Import Custom Components
import VoiceInput from './components/VoiceInput';
import MoodResult from './components/MoodResult';
import ImageGallery from './components/ImageGallery';


// RN 0.71+ expects native event modules to expose listener stubs.
if (NativeModules.Voice) {
  // Fix for React Native 0.71+ where addListener/removeListeners might be missing
  if (!NativeModules.Voice.addListener) {
    NativeModules.Voice.addListener = () => { };
  }
  if (!NativeModules.Voice.removeListeners) {
    NativeModules.Voice.removeListeners = () => { };
  }
}

import Voice from '@react-native-voice/voice';

const SAMPLE_IMAGES = [
  {
    id: 's1',
    uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
    fileName: 'serene_lake.jpg',
    type: 'image/jpeg',
    label: 'Serene Nature',
  },
  {
    id: 's2',
    uri: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
    fileName: 'chaotic_city.jpg',
    type: 'image/jpeg',
    label: 'Vibrant City',
  },
  {
    id: 's3',
    uri: 'https://images.unsplash.com/photo-1514516311115-38010f488e23?w=800&q=80',
    fileName: 'vintage_cafe.jpg',
    type: 'image/jpeg',
    label: 'Vintage Cafe',
  },
];

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(true);
  const [images, setImages] = useState([]);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [moodData, setMoodData] = useState(null);
  const [isSelectingImage, setIsSelectingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Configuration for Backend
  // Note: 10.0.2.2 is the localhost for Android emulator. 
  // Change to your machine's IP if testing on a real device.
  const BACKEND_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

  const onSpeechStart = useCallback(() => {
    setIsListening(true);
    setErrorMessage('');
    console.log('onSpeechStart');
  }, []);

  const onSpeechEnd = useCallback(() => {
    setIsListening(false);
    console.log('onSpeechEnd');
  }, []);

  const onSpeechResults = useCallback((event) => {
    const transcript = event && event.value && event.value[0] ? event.value[0] : '';
    setText(transcript);
    console.log('onSpeechResults: ', transcript);
  }, []);

  const onSpeechPartialResults = useCallback((event) => {
    const partial = event && event.value && event.value[0] ? event.value[0] : '';
    if (partial) {
      setText(partial);
    }
  }, []);

  const onSpeechError = useCallback((event) => {
    const error = event && event.error ? event.error : event;
    const code = error && error.code ? error.code : 'unknown';
    const message = error && error.message ? error.message : 'Unknown voice error';

    // Friendly error handling
    if (code === '7' || code === '6') {
      setErrorMessage('No speech detected. Please try again.');
    } else if (code === '9') {
      setErrorMessage('Microphone permission is missing. Please allow it and try again.');
    } else if (code === '8') {
      setErrorMessage('Speech recognition is busy. Please wait a moment and try again.');
    } else if (code === '5') {
      setErrorMessage(
        'Speech recognition is unavailable on this device right now. Check Google voice services and try again.',
      );
    } else {
      setErrorMessage(`Error (${code}): ${message}`);
    }

    setIsListening(false);
    console.log('onSpeechError: ', error);
  }, []);

  useEffect(() => {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    async function initializeVoice() {
      try {
        const available = await Voice.isAvailable();
        setIsVoiceAvailable(Boolean(available));

        if (!available) {
          setErrorMessage('Speech recognition is not available on this device.');
          return;
        }

        if (Platform.OS === 'android') {
          const services = await Voice.getSpeechRecognitionServices();
          if (!services || services.length === 0) {
            setErrorMessage(
              'No speech recognition service was found. Install or enable Google voice typing.',
            );
          }
        }
      } catch (err) {
        console.warn(err);
        setIsVoiceAvailable(false);
        setErrorMessage('Unable to initialize speech recognition.');
      }
    }

    initializeVoice();

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [onSpeechStart, onSpeechEnd, onSpeechResults, onSpeechError, onSpeechPartialResults]);

  const requestMicrophonePermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );

      if (alreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'This app needs access to your microphone to recognize speech.',
          buttonPositive: 'OK',
        },
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }, []);

  const requestCameraPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );

      if (alreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs access to your camera to capture images.',
          buttonPositive: 'OK',
        },
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }, []);

  const requestStoragePermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      let permission;
      // For Android 13 (API 33) and above, READ_MEDIA_IMAGES is used.
      // For Android 12 (API 32) and below, READ_EXTERNAL_STORAGE is used.
      if (Platform.Version >= 33) {
        permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
      } else {
        permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      }

      const alreadyGranted = await PermissionsAndroid.check(permission);

      if (alreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        permission,
        {
          title: 'Storage Permission',
          message: 'This app needs access to your photo gallery to select images.',
          buttonPositive: 'OK',
        },
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }, []);

  async function startListening() {
    if (isListening) {
      return;
    }

    try {
      setErrorMessage('');
      const hasPermission = await requestMicrophonePermission();

      if (!hasPermission) {
        setErrorMessage('Microphone permission denied');
        return;
      }

      const available = await Voice.isAvailable();
      if (!available) {
        setIsVoiceAvailable(false);
        setErrorMessage('Speech recognition is not available on this device.');
        return;
      }

      setIsVoiceAvailable(true);
      setText('');

      const recognizing = await Voice.isRecognizing();
      if (recognizing) {
        await Voice.cancel();
        // Give the native side a moment to fully release the session
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await Voice.start('en-US', {
        EXTRA_PARTIAL_RESULTS: true,
        REQUEST_PERMISSIONS_AUTO: false,
      });
    } catch (e) {
      setIsListening(false);
      setErrorMessage(
        (e && e.message) || 'Failed to start voice recognition. Please try again.',
      );
      console.error(e);
    }
  }

  async function stopListening() {
    try {
      if (isListening) {
        await Voice.stop();
      }
      setIsListening(false);

      // We don't call analyzeMood(text) here because 'text' might be stale.
      // Instead, we wait for onSpeechResults to provide the final transcript
      // or we use the latest partial result if onSpeechResults is slow.
      // For immediate feedback after 'STOP', we'll use the current text state.
      // But we add a small check to ensure we don't analyze empty text.

      setTimeout(() => {
        if (!isAnalyzing && text.trim()) {
          analyzeMood(text);
        }
      }, 500); // Wait for the final transcript to settle
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  }

  const analyzeMood = async (transcript) => {
    if (!transcript.trim()) return;

    setIsAnalyzing(true);
    setErrorMessage('');
    try {
      const response = await fetch(`${BACKEND_URL}/analyze-mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: transcript }),
      });

      if (!response.ok) {
        throw new Error('Server unreachable or error in analysis');
      }

      const data = await response.json();
      setMoodData(data);
    } catch (error) {
      console.error('Analysis error:', error);
      setErrorMessage('Could not connect to mood server. Make sure it is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeImageDescription = async (asset) => {
    if (!asset || !asset.uri) {
      console.warn('No asset or URI provided to analyzeImageDescription');
      return;
    }
    setIsAnalyzing(true);
    setErrorMessage('');
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
        name: asset.fileName || 'photo.jpg',
        type: asset.type || 'image/jpeg',
      });

      const response = await fetch(`${BACKEND_URL}/analyze-image`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header manually for FormData, 
        // fetch will set it with the correct boundary automatically.
      });

      if (!response.ok) throw new Error('Image analysis failed');

      const data = await response.json();
      setText(data.description);
      // Automatically trigger the detailed breakdown for the generated text
      analyzeMood(data.description);
    } catch (error) {
      console.error('Image analysis error:', error);
      setErrorMessage('Could not describe the image. Is the server running?');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCaptureImage = useCallback(async () => {
    if (isCapturingImage) {
      return;
    }

    try {
      setErrorMessage('');
      setIsCapturingImage(true);

      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission needed', 'Camera permission was denied.');
        return;
      }

      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.7,
        saveToPhotos: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Camera error', result.errorMessage || 'Unable to capture image.');
        return;
      }

      const asset = result.assets && result.assets[0];
      if (asset && asset.uri) {
        setImages(currentImages => [
          {
            id: `${Date.now()}`,
            uri: asset.uri,
            fileName: asset.fileName || `photo_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
          },
          ...currentImages,
        ]);
        analyzeImageVibe(asset);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Camera error', 'Something went wrong while opening the camera.');
    } finally {
      setIsCapturingImage(false);
    }
  }, [isCapturingImage, requestCameraPermission, analyzeImageDescription]);

  const handleSelectImage = useCallback(async () => {
    if (isSelectingImage) {
      return;
    }

    try {
      setErrorMessage('');
      setIsSelectingImage(true);

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission needed', 'Storage permission was denied.');
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.7,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Image selection error', result.errorMessage || 'Unable to select image.');
        return;
      }

      const asset = result.assets && result.assets[0];
      if (asset && asset.uri) {
        setImages(currentImages => [
          {
            id: `${Date.now()}`,
            uri: asset.uri,
            fileName: asset.fileName || `gallery_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
          },
          ...currentImages,
        ]);
        analyzeImageVibe(asset);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Image selection error', 'Something went wrong while selecting an image.');
    } finally {
      setIsSelectingImage(false);
    }
  }, [isSelectingImage, requestStoragePermission, analyzeImageDescription]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: '#f5f5f5',
    },
    content: {
      paddingVertical: 30,
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 30,
      color: '#333',
    },
    statusText: {
      marginTop: 10,
      color: isListening ? '#ff4d4d' : '#666',
      fontWeight: 'bold',
    },
    error: {
      marginTop: 20,
      color: '#d9534f',
      textAlign: 'center',
      fontWeight: '500',
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Scene Vibe Checker</Text>

      <VoiceInput
        text={text}
        onChangeText={setText}
        isListening={isListening}
        onStartListening={startListening}
        onStopListening={stopListening}
        onAnalyze={() => analyzeMood(text)}
        isAnalyzing={isAnalyzing}
      />

      <Text style={styles.statusText}>
        {isListening
          ? 'Recording active...'
          : isVoiceAvailable
            ? 'Tap button to start'
            : 'Speech recognition unavailable'}
      </Text>
      {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      <MoodResult
        moodData={moodData}
        isAnalyzing={isAnalyzing}
        isListening={isListening}
        hasText={text.length > 0}
      />

      <ImageGallery
        images={images}
        sampleImages={SAMPLE_IMAGES}
        onCapture={handleCaptureImage}
        onSelect={handleSelectImage}
        onAnalyzeImage={analyzeImageDescription}
        isCapturingImage={isCapturingImage}
        isSelectingImage={isSelectingImage}
        isAnalyzing={isAnalyzing}
      />
    </ScrollView>
  );
};

export default App;
