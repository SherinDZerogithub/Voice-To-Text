import React from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MoodHistorySidebar = ({
  historyAnim,
  isVisible,
  moodHistory,
  onClose,
  sidebarWidth,
}) => (
  <>
    {isVisible && (
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableOpacity>
    )}

    <Animated.View
      style={[
        styles.sidebarOverlay,
        {
          width: sidebarWidth,
          transform: [{translateX: historyAnim}],
        },
      ]}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>Your Mood Story</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Icon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {moodHistory.length === 0 ? (
          <Text style={styles.emptyText}>No patterns recorded yet.</Text>
        ) : (
          moodHistory.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={[styles.historySwatch, {backgroundColor: item.color}]}>
                <Text style={styles.historyEmoji}>{item.emoji}</Text>
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTime}>{item.timestamp}</Text>
                <Text style={styles.historyCaption} numberOfLines={2}>
                  {item.caption}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Animated.View>
  </>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
    elevation: 10,
    padding: 20,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingTop: Platform.OS === 'ios' ? 40 : 0,
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
  },
  closeBtn: {
    padding: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  historySwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyEmoji: {
    fontSize: 20,
  },
  historyInfo: {
    flex: 1,
  },
  historyTime: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 2,
  },
  historyCaption: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
});

export default MoodHistorySidebar;
