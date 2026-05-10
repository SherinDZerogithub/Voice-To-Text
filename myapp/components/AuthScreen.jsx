import React, {useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AvatarBuilder, {AvatarDisplay} from './AvatarBuilder';

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

const ACCENT = '#7c6ff7';
const ACCENT2 = '#a78bfa';

const FloatingInput = ({label, icon, value, onChangeText, ...props}) => {
  const [focused, setFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(labelAnim, {toValue: 1, duration: 180, useNativeDriver: false}).start();
  };
  const onBlur = () => {
    setFocused(false);
    if (!value) {
      Animated.timing(labelAnim, {toValue: 0, duration: 180, useNativeDriver: false}).start();
    }
  };

  const labelTop = labelAnim.interpolate({inputRange: [0, 1], outputRange: [14, -8]});
  const labelSize = labelAnim.interpolate({inputRange: [0, 1], outputRange: [15, 11]});
  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#9ca3af', focused ? ACCENT : '#9ca3af'],
  });

  return (
    <View style={[inputStyles.wrap, focused && inputStyles.wrapFocused]}>
      <View style={inputStyles.iconWrap}>
        <Icon name={icon} size={18} color={focused ? ACCENT : '#9ca3af'} />
      </View>
      <View style={{flex: 1}}>
        <Animated.Text style={[inputStyles.label, {top: labelTop, fontSize: labelSize, color: labelColor}]}>
          {label}
        </Animated.Text>
        <TextInput
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholderTextColor="transparent"
          {...props}
        />
      </View>
    </View>
  );
};

const inputStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f7ff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e5e3f5',
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 10,
    marginBottom: 14,
  },
  wrapFocused: {
    borderColor: ACCENT,
    backgroundColor: '#faf9ff',
    shadowColor: ACCENT,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {marginRight: 10, marginTop: 2},
  label: {
    position: 'absolute',
    left: 0,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  input: {
    fontSize: 15,
    color: '#1a1a2e',
    fontWeight: '500',
    paddingTop: 4,
    paddingBottom: 0,
    height: 28,
  },
});

const AuthScreen = ({onAuth, isLoading, errorMessage}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [avatarConfig, setAvatarConfig] = useState(DEFAULT_AVATAR_CONFIG);
  const [avatarBuilderVisible, setAvatarBuilderVisible] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchMode = () => {
    Animated.sequence([
      Animated.timing(slideAnim, {toValue: 1, duration: 150, useNativeDriver: true}),
      Animated.timing(slideAnim, {toValue: 0, duration: 150, useNativeDriver: true}),
    ]).start();
    setIsLogin(v => !v);
    setLocalError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = () => {
    setLocalError('');
    if (!isLogin && !name.trim()) return setLocalError('Please enter your name.');
    if (!email.trim() || !password.trim()) return setLocalError('Email and password are required.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setLocalError('Enter a valid email address.');
    if (password.length < 6) return setLocalError('Password must be at least 6 characters.');
    onAuth(isLogin, email, password, name, isLogin ? null : avatarConfig);
  };

  const error = localError || errorMessage;

  return (
    <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Background blobs */}
      <View style={styles.bg}>
        <View style={[styles.blob, styles.blob1]} />
        <View style={[styles.blob, styles.blob2]} />
        <View style={[styles.blob, styles.blob3]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Logo / Brand */}
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <Icon name="microphone-variant" size={28} color="#fff" />
          </View>
          <View>
            <Text style={styles.brandName}>MoodVoice</Text>
            <Text style={styles.brandTagline}>Your emotional companion</Text>
          </View>
        </View>

        {/* Card */}
        <Animated.View style={[styles.card, {opacity: slideAnim.interpolate({inputRange: [0, 0.5, 1], outputRange: [1, 0.4, 1]})}]}>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, isLogin && styles.tabBtnActive]}
              onPress={() => !isLogin && switchMode()}>
              <Text style={[styles.tabBtnText, isLogin && styles.tabBtnTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, !isLogin && styles.tabBtnActive]}
              onPress={() => isLogin && switchMode()}>
              <Text style={[styles.tabBtnText, !isLogin && styles.tabBtnTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cardTitle}>
            {isLogin ? 'Welcome back 👋' : 'Join the journey ✨'}
          </Text>
          <Text style={styles.cardSub}>
            {isLogin ? 'Log in to continue your mood journey' : 'Start tracking your emotional wellbeing'}
          </Text>

          {/* Avatar picker (signup only) */}
          {!isLogin && (
            <TouchableOpacity style={styles.avatarPicker} onPress={() => setAvatarBuilderVisible(true)} activeOpacity={0.8}>
              <AvatarDisplay config={avatarConfig} size={64} />
              <View style={styles.avatarPickerText}>
                <Text style={styles.avatarPickerTitle}>Your Avatar</Text>
                <Text style={styles.avatarPickerSub}>Tap to customize</Text>
              </View>
              <View style={styles.avatarPickerChevron}>
                <Icon name="chevron-right" size={20} color={ACCENT} />
              </View>
            </TouchableOpacity>
          )}

          {!isLogin && (
            <FloatingInput
              label="Full Name"
              icon="account-outline"
              value={name}
              onChangeText={t => {setName(t); setLocalError('');}}
              autoCapitalize="words"
            />
          )}

          <FloatingInput
            label="Email Address"
            icon="email-outline"
            value={email}
            onChangeText={t => {setEmail(t); setLocalError('');}}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={{position: 'relative'}}>
            <FloatingInput
              label="Password"
              icon="lock-outline"
              value={password}
              onChangeText={t => {setPassword(t); setLocalError('');}}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(v => !v)}>
              <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={15} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}>
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                <Icon name="arrow-right" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <TouchableOpacity onPress={switchMode}>
              <Text style={styles.switchLink}>{isLogin ? ' Sign up' : ' Sign in'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Features row */}
        <View style={styles.featuresRow}>
          {[
            {icon: 'microphone', label: 'Voice Logs'},
            {icon: 'chart-line', label: 'Analytics'},
            {icon: 'chat-outline', label: 'AI Chat'},
          ].map(f => (
            <View key={f.label} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Icon name={f.icon} size={16} color={ACCENT} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {!isLogin && (
        <AvatarBuilder
          visible={avatarBuilderVisible}
          onClose={() => setAvatarBuilderVisible(false)}
          onSave={cfg => {setAvatarConfig(cfg); setAvatarBuilderVisible(false);}}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f0c29',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.35,
  },
  blob1: {
    width: 320,
    height: 320,
    backgroundColor: '#7c6ff7',
    top: -80,
    left: -80,
  },
  blob2: {
    width: 240,
    height: 240,
    backgroundColor: '#a78bfa',
    top: 120,
    right: -60,
    opacity: 0.2,
  },
  blob3: {
    width: 200,
    height: 200,
    backgroundColor: '#06b6d4',
    bottom: 80,
    left: 40,
    opacity: 0.15,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 32,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    marginTop: 1,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f2ff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tabBtnText: {fontSize: 13, fontWeight: '600', color: '#9ca3af'},
  tabBtnTextActive: {color: ACCENT, fontWeight: '800'},
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 22,
    fontWeight: '500',
  },
  avatarPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f7ff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e5e3f5',
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  avatarPickerText: {flex: 1},
  avatarPickerTitle: {fontSize: 14, fontWeight: '700', color: '#1a1a2e'},
  avatarPickerSub: {fontSize: 12, color: '#9ca3af', marginTop: 2},
  avatarPickerChevron: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: ACCENT + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 18,
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {fontSize: 13, color: '#ef4444', fontWeight: '500', flex: 1},
  submitBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: ACCENT,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  submitBtnDisabled: {opacity: 0.6},
  submitBtnText: {color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2},
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  switchText: {fontSize: 13, color: '#6b7280'},
  switchLink: {fontSize: 13, color: ACCENT, fontWeight: '800'},
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 28,
  },
  featureItem: {alignItems: 'center', gap: 6},
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  featureLabel: {fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600'},
});

export default AuthScreen;
