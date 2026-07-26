import React from 'react';
import {View, TextInput, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '../theme/ThemeContext';

const getContrastColor = (hexcolor) => {
  if (!hexcolor || hexcolor === 'transparent') return '#000000';
  const hex = hexcolor.replace('#', '');
  if (hex.length !== 6) return '#000000';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#1a1a1a' : '#ffffff';
};

const VoiceInput = ({
  text,
  onChangeText,
  isListening,
  onStartListening,
  onStopListening,
  onAnalyze,
  isAnalyzing,
  appBgColor,
  shortDescription,
  longDescription,
}) => {
  const {moodBackground, moodColor} = useTheme();
  const bg = appBgColor || moodBackground || '#f5f5f5';
  const contrastColor = getContrastColor(bg);
  const isDarkBg = contrastColor === '#ffffff';

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
            isDarkBg && {
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderColor: 'rgba(255,255,255,0.2)',
              color: '#ffffff'
            }
          ]}
          placeholder={isListening ? 'Listening...' : 'Type or use voice...'}
          value={text}
          onChangeText={onChangeText}
          multiline
          placeholderTextColor={isDarkBg ? 'rgba(255,255,255,0.5)' : '#a4b0be'}
        />
        <TouchableOpacity
          style={[
            styles.voiceIconButton,
            { backgroundColor: isListening ? '#ff4757' : (isDarkBg ? 'rgba(255,255,255,0.15)' : '#f1f2f6') },
          ]}
          onPress={isListening ? onStopListening : onStartListening}
          activeOpacity={0.7}
        >
          <Icon
            name={isListening ? 'microphone-off' : 'microphone'}
            size={22}
            color={isListening ? '#fff' : (isDarkBg ? '#fff' : '#1e272e')}
          />
        </TouchableOpacity>
      </View>



      <TouchableOpacity
        style={[
          styles.analyzeButton,
          (!text.trim() || isAnalyzing) && styles.disabledButton,
          isDarkBg && { backgroundColor: moodColor || '#6c5ce7', shadowColor: '#000' }
        ]}
        onPress={onAnalyze}
        disabled={!text.trim() || isAnalyzing}
        activeOpacity={0.8}
      >
        <Text style={styles.analyzeButtonText}>
          {isAnalyzing ? 'Analyzing...' : 'Analyze Mood'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 15,
  },
  textInput: {
    width: '100%',
    minHeight: 120,
    backgroundColor: 'white',
    borderColor: '#e0e0e0',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 15,
    paddingRight: 50,
    textAlignVertical: 'top',
    fontSize: 17,
    color: '#2d3436',
  },
  voiceIconButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  analyzeButton: {
    width: '100%',
    backgroundColor: '#6c5ce7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#6c5ce7',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#a29bfe',
    elevation: 0,
    shadowOpacity: 0,
  },

});

export default VoiceInput;
