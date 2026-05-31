import React, {useEffect, useRef, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Modal,
} from 'react-native';
import Svg, {
  G,
  Circle,
  Path,
  Defs,
  RadialGradient,
  Stop,
  Line,
  Ellipse,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MoodGarden = ({analyticsData, onPlantTap, moodHistory = []}) => {
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [plants, setPlants] = useState([]);

  // Generate plants from mood data
  useEffect(() => {
    if (!analyticsData?.vibe_breakdown) {
      return;
    }

    const generatePlants = () => {
      const vibes = analyticsData.vibe_breakdown || [];
      const plantTypes = {
        happy: {emoji: '🌻', color: '#FFD93D', type: 'flower'},
        calm: {emoji: '🌿', color: '#6BCB77', type: 'leaf'},
        energetic: {emoji: '🌹', color: '#FF6B6B', type: 'flower'},
        sad: {emoji: '🌱', color: '#95B8D1', type: 'seedling'},
        anxious: {emoji: '🌾', color: '#D4A574', type: 'grass'},
        peaceful: {emoji: '🌸', color: '#FFB7C5', type: 'flower'},
        hopeful: {emoji: '🌼', color: '#FFE66D', type: 'flower'},
        lonely: {emoji: '🍂', color: '#CD7F32', type: 'leaf'},
        nostalgic: {emoji: '🌷', color: '#E75480', type: 'flower'},
        gloomy: {emoji: '☘️', color: '#7B8E89', type: 'leaf'},
      };

      return vibes.slice(0, 12).map((vibe, idx) => {
        const plantType = plantTypes[vibe.label.toLowerCase()] || {
          emoji: '🌱',
          color: '#6c5ce7',
          type: 'seedling',
        };
        const angle = (idx / Math.min(vibes.length, 12)) * 360;
        const radius = 80 + Math.random() * 40;
        const x = 150 + radius * Math.cos((angle * Math.PI) / 180);
        const y = 150 + radius * Math.sin((angle * Math.PI) / 180);

        return {
          id: `${vibe.label}-${idx}`,
          label: vibe.label,
          count: vibe.count,
          color: plantType.color,
          emoji: plantType.emoji,
          type: plantType.type,
          x,
          y,
          scale: 0.8 + (vibe.count / (vibes[0]?.count || 1)) * 0.4,
          rotation: Math.random() * 20 - 10,
        };
      });
    };

    setPlants(generatePlants());
  }, [analyticsData]);

  // Animate entrance
  useEffect(() => {
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [plants.length, scaleAnim]);

  const handlePlantPress = plant => {
    setSelectedPlant(plant);
    setShowDetails(true);
    onPlantTap?.(plant);
  };

  const PlantIcon = ({plant, index}) => {
    const plantAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.spring(plantAnim, {
          toValue: 1,
          friction: 5,
          tension: 35,
          useNativeDriver: true,
        }),
      ]).start();
    }, [index, plantAnim]);

    return (
      <Animated.View
        style={[
          styles.plantContainer,
          {
            left: plant.x,
            top: plant.y,
            transform: [{scale: plantAnim}, {rotate: `${plant.rotation}deg`}],
          },
        ]}>
        <TouchableOpacity
          onPress={() => handlePlantPress(plant)}
          activeOpacity={0.7}
          style={styles.plantButton}>
          <View
            style={[
              styles.plantCircle,
              {
                backgroundColor: plant.color,
                transform: [{scale: plant.scale}],
              },
            ]}>
            <Text style={[styles.plantEmoji, {fontSize: 24 * plant.scale}]}>
              {plant.emoji}
            </Text>
          </View>
          <Text style={styles.plantLabel} numberOfLines={1}>
            {plant.label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="flower" size={24} color="#6BCB77" />
        <Text style={styles.title}>Mood Garden</Text>
        <Text style={styles.subtitle}>{plants.length} moods blooming</Text>
      </View>

      <View style={styles.gardenCanvas}>
        <Svg width="300" height="300" style={styles.gardenBg}>
          <Defs>
            <RadialGradient id="soilGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#E8DCC4" stopOpacity="1" />
              <Stop offset="100%" stopColor="#D4C5B9" stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="150" cy="200" rx="140" ry="60" fill="url(#soilGrad)" />
          <Path
            d="M 20 200 Q 150 180 280 200"
            stroke="#C4B5A0"
            strokeWidth="2"
            fill="none"
          />
        </Svg>

        <Animated.View
          style={[styles.gardenContent, {transform: [{scale: scaleAnim}]}]}>
          {plants.map((plant, idx) => (
            <PlantIcon key={plant.id} plant={plant} index={idx} />
          ))}
        </Animated.View>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Entries</Text>
          <Text style={styles.statValue}>
            {analyticsData?.total_entries || 0}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Unique Moods</Text>
          <Text style={styles.statValue}>{plants.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Garden Health</Text>
          <Text style={styles.statValue}>
            {plants.length >= 7 ? '🌟' : '🌱'}
          </Text>
        </View>
      </View>

      {/* Plant Details Modal */}
      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetails(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPlant && (
              <>
                <Text style={styles.modalEmoji}>{selectedPlant.emoji}</Text>
                <Text style={styles.modalTitle}>{selectedPlant.label}</Text>
                <Text style={styles.modalCount}>
                  {selectedPlant.count} entries
                </Text>
                <Text style={styles.modalDescription}>
                  {selectedPlant.type === 'flower'
                    ? '🌸 A flourishing emotion'
                    : selectedPlant.type === 'leaf'
                    ? '🍃 A grounded feeling'
                    : '🌱 A growing emotion'}
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowDetails(false)}>
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F8F7FF',
    borderRadius: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3436',
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  gardenCanvas: {
    height: 300,
    backgroundColor: '#FFFBF0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  gardenBg: {
    position: 'absolute',
    bottom: 0,
  },
  gardenContent: {
    ...StyleSheet.absoluteFillObject,
  },
  plantContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: 60,
    marginLeft: -30,
    marginTop: -30,
  },
  plantButton: {
    alignItems: 'center',
    gap: 4,
  },
  plantCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  plantEmoji: {
    fontSize: 24,
  },
  plantLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
    width: 50,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6c5ce7',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 8,
  },
  modalCount: {
    fontSize: 14,
    color: '#6c5ce7',
    fontWeight: '600',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#6c5ce7',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default MoodGarden;
