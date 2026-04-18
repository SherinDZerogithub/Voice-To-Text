import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ImageGallery = ({
  images,
  sampleImages,
  onCapture,
  onSelect,
  onAnalyzeImage,
  isCapturingImage,
  isSelectingImage,
  isAnalyzing,
}) => {
  const handleQuickAnalyze = () => {
    const allImages = [...(images || []), ...(sampleImages || [])];
    if (allImages.length === 0) return;
    const randomImage = allImages[Math.floor(Math.random() * allImages.length)];
    onAnalyzeImage(randomImage);
  };

  return (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Saved Images</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.iconButton, isCapturingImage && styles.disabledButton]}
            onPress={onCapture}
            disabled={isCapturingImage}
            activeOpacity={0.7}
          >
            <Icon name="camera" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: '#3498db' }, isSelectingImage && styles.disabledButton]}
            onPress={onSelect}
            disabled={isSelectingImage}
            activeOpacity={0.7}
          >
            <Icon name="image-multiple" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: '#9b59b6' }, isAnalyzing && styles.disabledButton]}
            onPress={handleQuickAnalyze}
            disabled={isAnalyzing || (images.length === 0 && sampleImages.length === 0)}
            activeOpacity={0.7}
          >
            <Icon name="lightning-bolt" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.imageGrid}>
        {images.map((image, index) => (
          <View key={image.id} style={styles.imageCard}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} />
            <View style={styles.cardFooter}>
              <Text style={styles.imageLabel}>Saved Image {images.length - index}</Text>
              <TouchableOpacity
                style={[styles.analyzeButton, isAnalyzing && styles.disabledButton]}
                onPress={() => onAnalyzeImage(image)}
                disabled={isAnalyzing}
              >
                <Icon name="auto-fix" size={16} color="#fff" />
                <Text style={styles.analyzeButtonText}>Describe</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 40 }]}>App Library Samples</Text>
      <View style={styles.imageGrid}>
        {sampleImages.map((image) => (
          <View key={image.id} style={styles.imageCard}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} />
            <View style={styles.cardFooter}>
              <Text style={styles.imageLabel}>{image.label}</Text>
              <TouchableOpacity
                style={[styles.analyzeButton, { backgroundColor: '#3498db' }, isAnalyzing && styles.disabledButton]}
                onPress={() => onAnalyzeImage(image)}
                disabled={isAnalyzing}
              >
                <Icon name="auto-fix" size={16} color="#fff" />
                <Text style={styles.analyzeButtonText}>Analyze</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 36,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    backgroundColor: '#1f7a4c',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  disabledButton: {
    opacity: 0.6,
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
    color: '#444',
    fontWeight: '600',
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
  },
  analyzeButton: {
    backgroundColor: '#1f7a4c',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ImageGallery;
