import React, {useEffect, useMemo, useState} from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const normalizePlaylistList = data => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.playlists)) {
    return data.playlists;
  }

  if (Array.isArray(data?.suggestions)) {
    return data.suggestions;
  }

  return [];
};

const getPlaylistUrl = playlist =>
  playlist.playlistUrl ||
  playlist.playlist_url ||
  playlist.url ||
  playlist.link;

const getThumbnailUrl = playlist =>
  playlist.thumbnailUrl ||
  playlist.thumbnail_url ||
  playlist.thumbnail ||
  playlist.imageUrl ||
  playlist.image_url;

const PlaylistSuggestions = ({
  vibe,
  token,
  backendUrl,
  accentColor = '#6c5ce7',
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedVibe = useMemo(
    () => vibe?.toString().trim().toLowerCase(),
    [vibe],
  );

  useEffect(() => {
    if (!normalizedVibe || !backendUrl) {
      setSuggestions([]);
      setError('');
      return;
    }

    let isMounted = true;

    const fetchSuggestions = async () => {
      setLoading(true);
      setError('');

      try {
        const headers = token ? {Authorization: `Bearer ${token}`} : undefined;
        const response = await fetch(
          `${backendUrl}/playlist-suggestions/${encodeURIComponent(
            normalizedVibe,
          )}`,
          {headers},
        );

        if (!response.ok) {
          let detail = `Playlist request failed with status ${response.status}`;
          try {
            const errorData = await response.json();
            detail = errorData.detail || detail;
          } catch {
            // Keep the status-based message when the server does not return JSON.
          }
          throw new Error(detail);
        }

        const data = await response.json();

        if (isMounted) {
          setSuggestions(normalizePlaylistList(data));
        }
      } catch (fetchError) {
        if (isMounted) {
          setSuggestions([]);
          setError(
            fetchError.message || 'Unable to load playlist suggestions.',
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSuggestions();

    return () => {
      isMounted = false;
    };
  }, [backendUrl, normalizedVibe, token]);

  if (!normalizedVibe) {
    return null;
  }

  const openPlaylist = async playlist => {
    const url = getPlaylistUrl(playlist);
    if (url) {
      await Linking.openURL(url);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, {backgroundColor: `${accentColor}20`}]}>
          <Icon name="playlist-music" size={22} color={accentColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Playlist Suggestions</Text>
          <Text style={styles.subtitle}>For your {normalizedVibe} vibe</Text>
        </View>
      </View>

      {loading && <Text style={styles.message}>Loading suggestions...</Text>}
      {!!error && !loading && <Text style={styles.error}>Error: {error}</Text>}

      {!loading && !error && suggestions.length === 0 && (
        <Text style={styles.message}>No suggestions found for this vibe.</Text>
      )}

      {!loading &&
        !error &&
        suggestions.map((playlist, index) => {
          const thumbnailUrl = getThumbnailUrl(playlist);
          const playlistUrl = getPlaylistUrl(playlist);
          const title = playlist.title || playlist.name || 'Untitled playlist';
          const channelName =
            playlist.channelName || playlist.channel_name || playlist.channel;

          return (
            <TouchableOpacity
              key={`${title}-${index}`}
              style={styles.playlistItem}
              onPress={() => openPlaylist(playlist)}
              activeOpacity={playlistUrl ? 0.75 : 1}
              disabled={!playlistUrl}>
              {thumbnailUrl ? (
                <Image source={{uri: thumbnailUrl}} style={styles.thumbnail} />
              ) : (
                <View
                  style={[
                    styles.thumbnailFallback,
                    {backgroundColor: `${accentColor}20`},
                  ]}>
                  <Icon name="music-note" size={24} color={accentColor} />
                </View>
              )}
              <View style={styles.playlistText}>
                <Text style={styles.playlistTitle} numberOfLines={2}>
                  {title}
                </Text>
                {!!channelName && (
                  <Text style={styles.channelName} numberOfLines={1}>
                    {channelName}
                  </Text>
                )}
              </View>
              {!!playlistUrl && (
                <Icon name="open-in-new" size={18} color="#888" />
              )}
            </TouchableOpacity>
          );
        })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#fff',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2d3436',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#777',
    textTransform: 'capitalize',
  },
  message: {
    fontSize: 13,
    color: '#666',
  },
  error: {
    fontSize: 13,
    color: '#d63031',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    gap: 12,
  },
  thumbnail: {
    width: 64,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f1f1f1',
  },
  thumbnailFallback: {
    width: 64,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistText: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3436',
  },
  channelName: {
    marginTop: 3,
    fontSize: 12,
    color: '#777',
  },
});

export default PlaylistSuggestions;
