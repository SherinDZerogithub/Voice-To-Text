import React from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ACTIONS = [
  {key: 'speak', icon: 'microphone-outline', label: 'Speak now', color: '#7c6ff7'},
  {key: 'story', icon: 'book-open-page-variant', label: 'My story', color: '#f093fb'},
  {key: 'chat', icon: 'chat-processing-outline', label: 'Talk it out', color: '#36b9a5'},
];

const HomeQuickActions = ({onSpeak, onOpenStory, onOpenChat}) => {
  const handlers = {speak: onSpeak, story: onOpenStory, chat: onOpenChat};

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.eyebrow}>YOUR NEXT MOMENT</Text>
          <Text style={styles.title}>What feels right right now?</Text>
        </View>
        <View style={styles.sparkle}>
          <Icon name="star-four-points-outline" size={18} color="#7c6ff7" />
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionList}>
        {ACTIONS.map(action => (
          <TouchableOpacity
            key={action.key}
            style={[styles.action, {backgroundColor: `${action.color}12`, borderColor: `${action.color}35`}]}
            onPress={handlers[action.key]}
            activeOpacity={0.76}>
            <View style={[styles.actionIcon, {backgroundColor: `${action.color}20`}]}>
              <Icon name={action.icon} size={18} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Icon name="arrow-up-right" size={15} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 22,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.14)',
    shadowColor: '#7c6ff7',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  headingRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eyebrow: {
    color: '#8b86c9',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  title: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '800',
  },
  sparkle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1efff',
  },
  actionList: {
    paddingHorizontal: 16,
    gap: 9,
  },
  action: {
    minWidth: 130,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: '#303047',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
});

export default HomeQuickActions;
