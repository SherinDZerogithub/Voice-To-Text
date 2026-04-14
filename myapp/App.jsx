import React, {useEffect, useState, useCallback} from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Text,
  NativeModules,
} from 'react-native';
import {launchCamera} from 'react-native-image-picker';

// RN 0.71+ expects native event modules to expose listener stubs.
if (NativeModules.Voice) {
  NativeModules.Voice.addListener =
    NativeModules.Voice.addListener || (() => {});
  NativeModules.Voice.removeListeners =
    NativeModules.Voice.removeListeners || (() => {});
}

const Voice = require('@react-native-voice/voice').default;

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(true);
  const [images, setImages] = useState([]);
  const [isCapturingImage, setIsCapturingImage] = useState(false);

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
    } catch (e) {
      console.error(e);
    }
  }

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
        quality: 0.8,
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
          },
          ...currentImages,
        ]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Camera error', 'Something went wrong while opening the camera.');
    } finally {
      setIsCapturingImage(false);
    }
  }, [isCapturingImage, requestCameraPermission]);

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
    textInput: {
      width: '100%',
      minHeight: 100,
      backgroundColor: 'white',
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 10,
      padding: 15,
      marginBottom: 30,
      textAlignVertical: 'top',
      fontSize: 18,
      color: '#000',
    },
    button: {
      backgroundColor: isListening ? '#ff4d4d' : '#007bff',
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    secondaryButton: {
      width: '100%',
      backgroundColor: '#1f7a4c',
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 12,
      marginTop: 24,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    secondaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    error: {
      marginTop: 20,
      color: '#d9534f',
      textAlign: 'center',
      fontWeight: '500',
    },
    statusText: {
      marginTop: 10,
      color: isListening ? '#ff4d4d' : '#666',
      fontWeight: 'bold',
    },
    sectionTitle: {
      width: '100%',
      fontSize: 20,
      fontWeight: '700',
      color: '#333',
      marginTop: 36,
      marginBottom: 14,
    },
    emptyState: {
      width: '100%',
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#ddd',
      borderStyle: 'dashed',
      borderRadius: 12,
      padding: 18,
      alignItems: 'center',
    },
    emptyStateText: {
      color: '#666',
      textAlign: 'center',
    },
    imageGrid: {
      width: '100%',
      gap: 12,
    },
    imageCard: {
      width: '100%',
      backgroundColor: '#fff',
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#e4e4e4',
    },
    previewImage: {
      width: '100%',
      height: 220,
      backgroundColor: '#ddd',
    },
    imageLabel: {
      padding: 12,
      color: '#444',
      fontWeight: '500',
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Voice to Text</Text>
      <TextInput
        style={styles.textInput}
        placeholder={isListening ? 'Listening...' : 'Text will appear here'}
        value={text}
        multiline
        editable={false}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={isListening ? stopListening : startListening}
        activeOpacity={0.7}
      >
        <View>
          <Text style={styles.buttonText}>
            {isListening ? 'STOP' : 'START'}
          </Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.statusText}>
        {isListening
          ? 'Recording active...'
          : isVoiceAvailable
          ? 'Tap button to start'
          : 'Speech recognition unavailable'}
      </Text>
      {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      <Text style={styles.sectionTitle}>Camera Upload</Text>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleCaptureImage}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>
          {isCapturingImage ? 'Opening Camera...' : 'Take Photo'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Saved Images</Text>
      {images.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Capture a photo with the camera and it will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.imageGrid}>
          {images.map((image, index) => (
            <View key={image.id} style={styles.imageCard}>
              <Image source={{uri: image.uri}} style={styles.previewImage} />
              <Text style={styles.imageLabel}>Image {images.length - index}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default App;
