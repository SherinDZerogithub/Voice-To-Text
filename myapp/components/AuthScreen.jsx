import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AvatarBuilder, { AvatarDisplay } from './AvatarBuilder';

const DEFAULT_AVATAR_CONFIG = {
  gender: 'girl',
  skinTone: '#FDDBB4',
  hairStyle: 'long_straight',
  hairColor: '#4B3621',
  eyeStyle: 'normal',
  eyeColor: '#2c3e50',
  mouthStyle: 'smile',
  glasses: 'none',
  accessories: 'none',
  bgColor: '#f5e6ff',
};

const AuthScreen = ({ onAuth, isLoading, errorMessage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const [avatarConfig, setAvatarConfig] = useState(DEFAULT_AVATAR_CONFIG);
  const [avatarBuilderVisible, setAvatarBuilderVisible] = useState(false);

  const validateEmail = (text) => {
    // Simple email regex validation
    const regex = /^\S+@\S+\.\S+$/;
    return regex.test(text);
  };

  const handleSubmit = () => {
    setLocalError('');
    
    if (!isLogin && !name.trim()) {
      setLocalError('Please fill in your name.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in both email and password.');
      return;
    }
    
    if (!validateEmail(email)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    onAuth(isLogin, email, password, name, isLogin ? null : avatarConfig);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scene Vibe Checker</Text>
      <Text style={styles.subtitle}>{isLogin ? 'Welcome back!' : 'Create an account'}</Text>

      {!isLogin && (
        <>
          <View style={styles.avatarSection}>
            <Text style={styles.label}>Your Avatar</Text>
            <View style={styles.avatarRow}>
              <AvatarDisplay config={avatarConfig} size={80} onPress={() => setAvatarBuilderVisible(true)} />
              <TouchableOpacity style={styles.editAvatarBtn} onPress={() => setAvatarBuilderVisible(true)}>
                <Text style={styles.editAvatarBtnText}>Customize Avatar</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setLocalError('');
              }}
              autoCapitalize="words"
            />
          </View>
        </>
      )}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#999"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setLocalError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#999"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setLocalError('');
          }}
          secureTextEntry
        />
      </View>

      {(localError || errorMessage) ? (
        <Text style={styles.errorText}>{localError || errorMessage}</Text>
      ) : null}

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
        </Text>
        <TouchableOpacity onPress={() => {
          setIsLogin(!isLogin);
          setLocalError('');
          setName('');
          setEmail('');
          setPassword('');
        }}>
          <Text style={styles.switchLink}>{isLogin ? 'Sign Up' : 'Log In'}</Text>
        </TouchableOpacity>
      </View>

      {!isLogin && (
        <AvatarBuilder
          visible={avatarBuilderVisible}
          onClose={() => setAvatarBuilderVisible(false)}
          onSave={(newConfig) => {
            setAvatarConfig(newConfig);
            setAvatarBuilderVisible(false);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  avatarSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  editAvatarBtn: {
    marginLeft: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
  },
  editAvatarBtnText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#99caff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#d9534f',
    marginBottom: 15,
    textAlign: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#666',
    fontSize: 14,
  },
  switchLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AuthScreen;

