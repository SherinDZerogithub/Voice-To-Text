import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Constants ────────────────────────────────────────────────────────────────
const SAGE_COLOR   = '#7c6ff7';
const SAGE_LIGHT   = '#ede9fe';
const SAGE_DARK    = '#5b4fd4';
const SCREEN_W     = Dimensions.get('window').width;

const STARTER_PROMPTS = [
  { icon: 'emoticon-sad-outline',      label: "I've been feeling overwhelmed lately…" },
  { icon: 'lightning-bolt-outline',    label: "I'm struggling to find motivation" },
  { icon: 'chat-question-outline',     label: "Something is bothering me" },
  { icon: 'heart-pulse',               label: "I feel anxious and I'm not sure why" },
];

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator = () => {
  const dots  = [useRef(new Animated.Value(0)).current,
                 useRef(new Animated.Value(0)).current,
                 useRef(new Animated.Value(0)).current];
  const loops = useRef([]);

  useEffect(() => {
    loops.current = dots.map((dot, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(dot, { toValue: -6, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue:  0, duration: 280, useNativeDriver: true }),
          Animated.delay(560),
        ])
      );
      loop.start();
      return loop;
    });
    return () => loops.current.forEach(l => l.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.typingBubble}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.typingDot, { transform: [{ translateY: dot }] }]}
        />
      ))}
    </View>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = React.memo(({ message }) => {
  const isUser   = message.role === 'user';
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowSage,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      {!isUser && (
        <View style={styles.sageAvatar}>
          <Text style={styles.sageAvatarEmoji}>🌿</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.sageBubble]}>
        <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
          {message.text}
        </Text>
        {message.time ? (
          <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
            {message.time}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
});

// ─── Starter Prompt Chip ──────────────────────────────────────────────────────
const StarterChip = ({ item, onPress, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, tension: 50, friction: 9, delay, useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ scale: anim }] }}>
      <TouchableOpacity style={styles.starterChip} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.starterChipIcon}>
          <Icon name={item.icon} size={18} color={SAGE_COLOR} />
        </View>
        <Text style={styles.starterChipText}>{item.label}</Text>
        <Icon name="chevron-right" size={16} color={SAGE_COLOR} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TherapistChat = ({ token, backendUrl, vibeContext, onClose }) => {
  const isMounted     = useRef(true);
  const flatListRef   = useRef(null);
  const inputRef      = useRef(null);
  const headerAnim    = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'model',
      text: vibeContext
        ? `I can see you're feeling ${vibeContext} right now. I'm Sage — I'm here to listen. What's on your mind?`
        : "Hi, I'm Sage 🌿 — your safe space to talk. I'm here to listen without judgment. What's on your mind today?",
      time: formatTime(new Date()),
    },
  ]);
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState('');
  const [retryText, setRetryText] = useState('');

  useEffect(() => {
    isMounted.current = true;
    Animated.spring(headerAnim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }).start();
    return () => { isMounted.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const sendMessage = useCallback(
    async (textOverride) => {
      const text = (textOverride ?? input).trim();
      if (!text || isLoading) return;

      const userMsg = {
        id:   Date.now().toString(),
        role: 'user',
        text,
        time: formatTime(new Date()),
      };
      const nextMessages = [...messages, userMsg];

      if (isMounted.current) {
        setMessages(nextMessages);
        setInput('');
        setIsLoading(true);
        setError('');
        setRetryText('');
      }

      // slight delay to let the message render before scrolling
      setTimeout(scrollToBottom, 120);

      try {
        const history = nextMessages
          .filter(m => m.id !== 'intro')
          .map(m => ({ role: m.role, text: m.text }));

        const res = await fetch(`${backendUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: history,
            vibe_context: vibeContext || null,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error ${res.status}`);
        }

        const data   = await res.json();
        const sageMsg = {
          id:   `sage-${Date.now()}`,
          role: 'model',
          text: data.reply,
          time: formatTime(new Date()),
        };

        if (isMounted.current) {
          setMessages(prev => [...prev, sageMsg]);
          setTimeout(scrollToBottom, 120);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err.message || 'Something went wrong. Please try again.');
          setRetryText(text); // allow retry with same text
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    [input, messages, isLoading, backendUrl, token, vibeContext, scrollToBottom]
  );

  const clearChat = () => {
    setMessages([
      {
        id:   'intro',
        role: 'model',
        text: "Let's start fresh. I'm here whenever you're ready. 🌿",
        time: formatTime(new Date()),
      },
    ]);
    setInput('');
    setError('');
    setRetryText('');
  };

  // ── Render helpers ──────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => {
    if (item.id === '_starters') {
      return (
        <View style={styles.starterSection}>
          <Text style={styles.starterLabel}>Try saying…</Text>
          {STARTER_PROMPTS.map((prompt, i) => (
            <StarterChip
              key={i}
              item={prompt}
              delay={i * 80}
              onPress={() => sendMessage(prompt.label)}
            />
          ))}
        </View>
      );
    }
    if (item.id === '_typing') {
      return (
        <View style={styles.messageRowSage}>
          <View style={styles.sageAvatar}>
            <Text style={styles.sageAvatarEmoji}>🌿</Text>
          </View>
          <TypingIndicator />
        </View>
      );
    }
    if (item.id === '_error') {
      return (
        <View style={styles.errorCard}>
          <Icon name="alert-circle-outline" size={16} color="#e17055" />
          <Text style={styles.errorText}>{item.text}</Text>
          {item.retryText ? (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => sendMessage(item.retryText)}
            >
              <Icon name="refresh" size={14} color="#fff" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }
    return <MessageBubble message={item} />;
  }, [sendMessage]);

  // Build data array for FlatList
  const listData = [
    ...(messages.length === 1 ? [{ id: '_starters' }] : []),
    ...messages,
    ...(isLoading          ? [{ id: '_typing'   }] : []),
    ...(error              ? [{ id: '_error', text: error, retryText }] : []),
  ];

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-left" size={22} color="#444" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarWrap}>
            <Text style={styles.headerAvatarEmoji}>🌿</Text>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>Sage</Text>
            <Text style={styles.headerSub}>{isLoading ? 'Thinking…' : 'AI Companion · Always here'}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={clearChat} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="refresh" size={20} color="#999" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Disclaimer ─────────────────────────────────────────── */}
      <View style={styles.disclaimer}>
        <Icon name="shield-check-outline" size={12} color={SAGE_COLOR} />
        <Text style={styles.disclaimerText}>
          Not a substitute for professional mental health care.
        </Text>
      </View>

      {/* ── Message list ────────────────────────────────────────── */}
      <FlatList
        ref={flatListRef}
        data={listData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
      />

      {/* ── Input bar ────────────────────────────────────────────── */}
      <View style={styles.inputBar}>
        <View style={styles.inputWrap}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Share what's on your mind…"
            placeholderTextColor="#b2bec3"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            returnKeyType="default"
            blurOnSubmit={false}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="send" size={19} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F5FF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 54 : 14,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e4fe',
    elevation: 4,
    shadowColor: SAGE_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F6F5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SAGE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#d6d0fc',
  },
  headerAvatarEmoji: { fontSize: 22 },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00b894',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2d3436',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
    fontWeight: '500',
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#f0eeff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd9fb',
  },
  disclaimerText: {
    fontSize: 11,
    color: SAGE_COLOR,
    fontStyle: 'italic',
    fontWeight: '500',
  },

  // List
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },

  // Message row
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowSage: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: SCREEN_W * 0.82,
  },
  messageRowUser: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    maxWidth: SCREEN_W * 0.78,
  },

  // Avatar
  sageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SAGE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#d6d0fc',
    flexShrink: 0,
  },
  sageAvatarEmoji: { fontSize: 16 },

  // Bubble
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 20,
  },
  sageBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e4fe',
    borderBottomLeftRadius: 5,
    elevation: 1,
    shadowColor: SAGE_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  userBubble: {
    backgroundColor: SAGE_COLOR,
    borderBottomRightRadius: 5,
    elevation: 3,
    shadowColor: SAGE_DARK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    color: '#2d3436',
    lineHeight: 22,
  },
  userBubbleText: { color: '#fff' },
  bubbleTime: {
    fontSize: 10,
    color: '#bbb',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.55)' },

  // Typing
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e4fe',
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 1,
    shadowColor: SAGE_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: SAGE_COLOR,
    opacity: 0.7,
  },

  // Starters
  starterSection: { gap: 8, marginBottom: 6 },
  starterLabel: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
    marginBottom: 2,
  },
  starterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4dffd',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 1,
    shadowColor: SAGE_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  starterChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: SAGE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterChipText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
  },

  // Error
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#fde8e8',
    marginVertical: 4,
    maxWidth: SCREEN_W - 48,
  },
  errorText: {
    fontSize: 13,
    color: '#e17055',
    flex: 1,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e17055',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e8e4fe',
    elevation: 8,
    shadowColor: SAGE_COLOR,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#F6F5FF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e4dffd',
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 46,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: '#2d3436',
    maxHeight: 120,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    lineHeight: 20,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: SAGE_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: SAGE_DARK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  sendBtnDisabled: {
    backgroundColor: '#c8c4f0',
    elevation: 0,
    shadowOpacity: 0,
  },
});

export default TherapistChat;