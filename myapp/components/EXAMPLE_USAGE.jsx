/**
 * EXAMPLE USAGE - Interactive Mood Features
 *
 * This file demonstrates how to integrate all 6 interactive mood features
 * into your existing React Native app.
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import all interactive components
import MoodGarden from './MoodGarden';
import MoodDice from './MoodDice';
import MoodTwin from './MoodTwin';
import MoodJar from './MoodJar';
import GoalAlignmentRing from './GoalAlignmentRing';
import CelebrationCorner from './CelebrationCorner';

/**
 * EXAMPLE: Home Tab with Interactive Features
 *
 * This shows how to use Mood Twin, Mood Dice, and Mood Jar
 * on your home/dashboard screen.
 */
const HomeTabExample = ({
  onJournalEntry,
  onCheckIn,
  onGemAdded,
  onTabChange,
}) => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome Back! 👋</Text>
        <Text style={styles.headerSubtitle}>How are you feeling today?</Text>
      </View>

      {/* Mood Twin - Interactive Avatar */}
      <MoodTwin
        onCheckIn={checkIn => {
          console.log('Check-in:', checkIn);
          onCheckIn?.(checkIn);
          // Optionally save to backend
          // await fetch(`${BACKEND_URL}/check-in`, {
          //   method: 'POST',
          //   headers: { 'Authorization': `Bearer ${token}` },
          //   body: JSON.stringify(checkIn)
          // });
        }}
        onTabChange={onTabChange}
      />

      {/* Mood Dice - Journal Prompts */}
      <MoodDice
        onJournalEntry={entry => {
          console.log('Journal entry:', entry);
          onJournalEntry?.(entry);
          // Save to backend
          // await fetch(`${BACKEND_URL}/journal`, {
          //   method: 'POST',
          //   headers: { 'Authorization': `Bearer ${token}` },
          //   body: JSON.stringify(entry)
          // });
        }}
        onTabChange={onTabChange}
      />

      {/* Mood Jar - Gratitude Container */}
      <MoodJar
        onGemAdded={gem => {
          console.log('Gem added:', gem);
          onGemAdded?.(gem);
          // Save to backend
          // await fetch(`${BACKEND_URL}/gratitude`, {
          //   method: 'POST',
          //   headers: { 'Authorization': `Bearer ${token}` },
          //   body: JSON.stringify(gem)
          // });
        }}
        onJarFull={jarData => {
          console.log('Jar full! Celebration unlocked:', jarData);
          // Handle jar completion - show special animation or unlock reward
        }}
      />

      {/* Spacer */}
      <View style={styles.spacer} />
    </ScrollView>
  );
};

/**
 * EXAMPLE: Journey/Analytics Tab with Interactive Features
 *
 * This shows how to use Mood Garden, Goal Alignment Ring, and Celebration Corner
 * on your analytics/journey screen.
 */
const JourneyTabExample = ({analyticsData, moodGoal, moodHistory}) => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Mood Journey 🌿</Text>
        <Text style={styles.headerSubtitle}>
          See your progress and achievements
        </Text>
      </View>

      {/* Mood Garden - Visual Mood Representation */}
      <MoodGarden
        analyticsData={analyticsData}
        moodHistory={moodHistory}
        onPlantTap={plant => {
          console.log('Tapped plant:', plant);
          // Show detailed view of this mood
          // Could navigate to filtered history view
        }}
      />

      {/* Goal Alignment Ring - Progress Compass */}
      <GoalAlignmentRing
        moodGoal={moodGoal}
        analyticsData={analyticsData}
        onGoalUpdate={newGoal => {
          console.log('Goal updated:', newGoal);
          // Update goal in backend
        }}
      />

      {/* Celebration Corner - Badges & Achievements */}
      <CelebrationCorner
        analyticsData={analyticsData}
        moodHistory={moodHistory}
      />

      {/* Spacer */}
      <View style={styles.spacer} />
    </ScrollView>
  );
};

/**
 * EXAMPLE: Full App Integration
 *
 * This shows how to integrate both tabs into your main App component.
 */
export const FullAppExample = () => {
  // State management
  const [activeTab, setActiveTab] = useState('home'); // 'home' or 'journey'
  const [moodHistory, setMoodHistory] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    total_entries: 0,
    consecutive_days: 0,
    vibe_breakdown: [],
    goal_completed: false,
  });
  const [moodGoal, setMoodGoal] = useState({
    vibe: 'calm',
    vibes: ['calm', 'peaceful'],
    updated_at: new Date().toISOString(),
  });

  // Handlers for Home Tab
  const handleCheckIn = useCallback(checkIn => {
    console.log('Check-in saved:', checkIn);
    // Add to mood history
    // Update analytics
  }, []);

  const handleJournalEntry = useCallback(entry => {
    console.log('Journal entry saved:', entry);
    // Save to backend
    // Update mood history
  }, []);

  const handleGemAdded = useCallback(gem => {
    console.log('Gem added:', gem);
    // Save to backend
    // Update gratitude count
  }, []);

  const handleJarFull = useCallback(jarData => {
    console.log('Jar full! Unlocking achievement:', jarData);
    // Show celebration
    // Unlock badge
    // Update analytics
  }, []);

  // Tab Navigation
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTabExample
            onJournalEntry={handleJournalEntry}
            onCheckIn={handleCheckIn}
            onGemAdded={handleGemAdded}
            onTabChange={setActiveTab}
          />
        );
      case 'journey':
        return (
          <JourneyTabExample
            analyticsData={analyticsData}
            moodGoal={moodGoal}
            moodHistory={moodHistory}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Content */}
      {renderContent()}

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'home' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('home')}>
          <Icon
            name="home"
            size={24}
            color={activeTab === 'home' ? '#6c5ce7' : '#999'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'home' && styles.tabLabelActive,
            ]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'journey' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('journey')}>
          <Icon
            name="compass"
            size={24}
            color={activeTab === 'journey' ? '#6c5ce7' : '#999'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'journey' && styles.tabLabelActive,
            ]}>
            Journey
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

/**
 * EXAMPLE: Backend Integration
 *
 * Here's how to connect the components to your backend API.
 */
const BACKEND_URL = 'http://localhost:8000'; // or your actual backend URL

export const BackendIntegrationExample = {
  /**
   * Save check-in from Mood Twin
   */
  async saveCheckIn(token, checkIn) {
    try {
      const response = await fetch(`${BACKEND_URL}/mood-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vibe: checkIn.mood,
          caption: checkIn.response,
          timestamp: checkIn.timestamp,
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving check-in:', error);
      throw error;
    }
  },

  /**
   * Save journal entry from Mood Dice
   */
  async saveJournalEntry(token, entry) {
    try {
      const response = await fetch(`${BACKEND_URL}/journal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: entry.prompt,
          response: entry.response,
          category: entry.category,
          timestamp: entry.timestamp,
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving journal entry:', error);
      throw error;
    }
  },

  /**
   * Save gratitude from Mood Jar
   */
  async saveGratitude(token, gem) {
    try {
      const response = await fetch(`${BACKEND_URL}/gratitude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: gem.text,
          color: gem.color,
          timestamp: gem.timestamp,
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving gratitude:', error);
      throw error;
    }
  },

  /**
   * Fetch analytics for Mood Garden & Goal Ring
   */
  async fetchAnalytics(token) {
    try {
      const response = await fetch(`${BACKEND_URL}/analytics/me?days=30`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  },

  /**
   * Fetch mood history for Celebration Corner
   */
  async fetchMoodHistory(token) {
    try {
      const response = await fetch(
        `${BACKEND_URL}/mood-history?page=1&page_size=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching mood history:', error);
      throw error;
    }
  },
};

/**
 * EXAMPLE: State Management with Hooks
 *
 * Here's a custom hook to manage all the interactive features' state.
 */
export const useInteractiveMoodFeatures = token => {
  const [moodHistory, setMoodHistory] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [moodGoal, setMoodGoal] = useState(null);
  const [gems, setGems] = useState([]);
  const [badges, setBadges] = useState([]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [analytics, history] = await Promise.all([
        BackendIntegrationExample.fetchAnalytics(token),
        BackendIntegrationExample.fetchMoodHistory(token),
      ]);
      setAnalyticsData(analytics);
      setMoodHistory(history);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [token]);

  // Handle check-in
  const handleCheckIn = useCallback(
    async checkIn => {
      try {
        const result = await BackendIntegrationExample.saveCheckIn(
          token,
          checkIn,
        );
        setMoodHistory([result, ...moodHistory]);
        // Refresh analytics
        const analytics = await BackendIntegrationExample.fetchAnalytics(token);
        setAnalyticsData(analytics);
      } catch (error) {
        console.error('Error handling check-in:', error);
      }
    },
    [token, moodHistory],
  );

  // Handle journal entry
  const handleJournalEntry = useCallback(
    async entry => {
      try {
        await BackendIntegrationExample.saveJournalEntry(token, entry);
        // Refresh data
        const history = await BackendIntegrationExample.fetchMoodHistory(token);
        setMoodHistory(history);
      } catch (error) {
        console.error('Error handling journal entry:', error);
      }
    },
    [token],
  );

  // Handle gem added
  const handleGemAdded = useCallback(
    async gem => {
      try {
        const result = await BackendIntegrationExample.saveGratitude(
          token,
          gem,
        );
        setGems([...gems, result]);
      } catch (error) {
        console.error('Error handling gem:', error);
      }
    },
    [token, gems],
  );

  return {
    moodHistory,
    analyticsData,
    moodGoal,
    gems,
    badges,
    fetchData,
    handleCheckIn,
    handleJournalEntry,
    handleGemAdded,
  };
};

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  spacer: {
    height: 80, // Space for tab bar
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    borderTopWidth: 3,
    borderTopColor: '#6c5ce7',
  },
  tabLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#6c5ce7',
  },
});

export default FullAppExample;
