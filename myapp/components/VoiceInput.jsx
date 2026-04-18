import React from 'react';
import {View, TextInput, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const VoiceInput = ({
  text,
  onChangeText,
  isListening,
  onStartListening,
  onStopListening,
  onAnalyze,
  isAnalyzing,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={isListening ? 'Listening...' : 'Type or use voice...'}
          value={text}
          onChangeText={onChangeText}
          multiline
          placeholderTextColor="#a4b0be"
        />
        <TouchableOpacity
          style={[
            styles.voiceIconButton,
            {backgroundColor: isListening ? '#ff4757' : '#f1f2f6'},
          ]}
          onPress={isListening ? onStopListening : onStartListening}
          activeOpacity={0.7}
        >
          <Icon
            name={isListening ? 'microphone-off' : 'microphone'}
            size={22}
            color={isListening ? '#fff' : '#2f3542'}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.analyzeButton,
          (!text.trim() || isAnalyzing) && styles.disabledButton,
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
