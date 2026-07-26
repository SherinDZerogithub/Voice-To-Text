import React, {useEffect, useRef, useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchImageLibrary} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Path, Rect, SvgXml} from 'react-native-svg';
import {DoodleCanvas, STICKERS, getStickerXml, pointsToPath} from './DoodleCanvas';

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');

// ─── Paper palette ───────────────────────────────────────────────────────────
// A warm, physical "paper" identity — deliberately distinct from the rest of
// the app's cool white cards, because this screen is meant to feel like a
// real keepsake book rather than another digital panel.
const INK = '#3A2E28';
const PAPER_COLORS = ['#FBF6EC', '#FFF3E0', '#F3F8F0', '#F0F4FB', '#FBEFF2', '#2C2A33'];
const ACCENT = '#a29bfe';

const PAGE_STORAGE_PREFIX = 'story_journal_pages_v1';

const makePageId = () => `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const blankPage = (paperColor) => ({
  id: makePageId(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  paperColor: paperColor || PAPER_COLORS[0],
  text: '',
  doodle: null, // {paths, stickers, bgColor}
  photos: [], // [{id, uri, x, y, scale}]
});

/**
 * Loads this user's saved journal pages from on-device storage.
 * Pages are scoped by an opaque key derived from the auth token so two
 * different accounts on the same device never see each other's journal.
 */
const loadPages = async (storageKey) => {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
};

const savePages = async (storageKey, pages) => {
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(pages));
  } catch (err) {
    console.warn('Story Journal: failed to save pages', err);
  }
};

const getStorageKey = (token) => {
  // Token isn't decoded — just used as a stable per-account namespace so
  // pages persist across app restarts but stay separated between accounts.
  const safe = (token || 'guest').replace(/[^a-zA-Z0-9]/g, '').slice(-32);
  return `${PAGE_STORAGE_PREFIX}:${safe}`;
};

const requestPhotoPermission = async () => {
  if (Platform.OS !== 'android') return true;
  try {
    const permission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const already = await PermissionsAndroid.check(permission);
    if (already) return true;
    const granted = await PermissionsAndroid.request(permission, {
      title: 'Photo Access',
      message: 'Your journal needs access to your photos to add pictures to a page.',
      buttonPositive: 'OK',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn(err);
    return false;
  }
};

// ─── Draggable photo ─────────────────────────────────────────────────────────
// Mirrors the DoodleCanvas draggable-sticker pattern: drag to move, a corner
// handle to resize, a badge to delete — kept visually consistent with the
// rest of the journal's gesture language.

const DraggablePhoto = ({photo, isActive, onActivate, onChange, onDelete, locked}) => {
  const posRef = useRef({x: photo.x, y: photo.y});
  const scaleRef = useRef(photo.scale);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !locked,
      onMoveShouldSetPanResponder: () => !locked,
      onPanResponderGrant: () => {
        onActivate(photo.id);
        posRef.current = {x: photo.x, y: photo.y};
      },
      onPanResponderMove: (_, g) => {
        onChange(photo.id, {x: posRef.current.x + g.dx, y: posRef.current.y + g.dy});
      },
      onPanResponderRelease: (_, g) => {
        posRef.current = {x: posRef.current.x + g.dx, y: posRef.current.y + g.dy};
      },
    }),
  ).current;

  const resizePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !locked,
      onMoveShouldSetPanResponder: () => !locked,
      onPanResponderGrant: () => {
        scaleRef.current = photo.scale;
      },
      onPanResponderMove: (_, g) => {
        const newScale = Math.max(0.4, Math.min(3, scaleRef.current + (g.dx + g.dy) / 160));
        onChange(photo.id, {scale: newScale});
      },
    }),
  ).current;

  const size = 130 * photo.scale;

  return (
    <View
      style={[bookStyles.photoWrapper, {left: photo.x, top: photo.y, width: size, height: size}]}
      {...(locked ? {} : pan.panHandlers)}>
      <Image source={{uri: photo.uri}} style={bookStyles.photoImage} resizeMode="cover" />
      {isActive && !locked && (
        <>
          <TouchableOpacity style={bookStyles.photoDelete} onPress={() => onDelete(photo.id)}>
            <Icon name="close-circle" size={20} color="#e74c3c" />
          </TouchableOpacity>
          <View style={bookStyles.photoResizeHandle} {...resizePan.panHandlers}>
            <Icon name="arrow-expand" size={12} color={ACCENT} />
          </View>
        </>
      )}
    </View>
  );
};

// ─── A single page ───────────────────────────────────────────────────────────
// The "paper" itself: background color, written text, any drawing/stickers,
// and any photos placed on top. Photos are only draggable while photoMode is
// on, so normal scrolling/reading isn't fighting with accidental drags.

const PAGE_MARGIN = 18;
const PAGE_WIDTH = SCREEN_W - PAGE_MARGIN * 2;

const DoodleLayer = ({doodle}) => {
  if (!doodle) return null;

  return (
    <View style={bookStyles.doodleLayer} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill}>
        {doodle.bgColor && (
          <Rect x="0" y="0" width="100%" height="100%" fill={doodle.bgColor} />
        )}
        {(doodle.paths || []).map(path => (
          <React.Fragment key={path.id}>
            <Path
              d={pointsToPath(path.points)}
              stroke={path.color}
              strokeWidth={path.size}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {path.mirrored && (
              <Path
                d={pointsToPath(path.points.map(p => ({x: (path.mirrorX || 0) * 2 - p.x, y: p.y})))}
                stroke={path.color}
                strokeWidth={path.size}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
          </React.Fragment>
        ))}
      </Svg>
      {(doodle.stickers || []).map(sticker => {
        const stickerData = STICKERS.find(s => s.id === sticker.stickerId);
        if (!stickerData) return null;
        const stickerSize = 60 * sticker.scale;
        return (
          <View
            key={sticker.id}
            style={[
              bookStyles.doodleSticker,
              {left: sticker.x, top: sticker.y, width: stickerSize, height: stickerSize},
            ]}>
            <SvgXml
              xml={getStickerXml(stickerData.svg, sticker.color)}
              width={stickerSize}
              height={stickerSize}
            />
          </View>
        );
      })}
    </View>
  );
};

const JournalPage = ({
  page,
  pageNumber,
  isWriting,
  draftText,
  onChangeDraftText,
  photoMode,
  activePhotoId,
  onActivatePhoto,
  onChangePhoto,
  onDeletePhoto,
}) => {
  const isDark = page.paperColor === '#2C2A33';
  const textColor = isDark ? '#F2EEEA' : INK;

  return (
    <View style={[bookStyles.page, {backgroundColor: page.paperColor}]}>
      {/* Paper texture lines for that "real journal" feel */}
      <View style={bookStyles.paperLines} pointerEvents="none">
        {Array.from({length: 14}).map((_, i) => (
          <View
            key={i}
            style={[
              bookStyles.paperLine,
              {backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(58,46,40,0.06)'},
            ]}
          />
        ))}
      </View>

      <View style={bookStyles.pageHeaderRow}>
        <Text style={[bookStyles.pageNumber, {color: textColor, opacity: 0.5}]}>
          Page {pageNumber}
        </Text>
        <Text style={[bookStyles.pageDate, {color: textColor, opacity: 0.5}]}>
          {new Date(page.createdAt).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})}
        </Text>
      </View>

      <ScrollView
        style={bookStyles.pageScroll}
        contentContainerStyle={bookStyles.pageScrollContent}
        scrollEnabled={!photoMode}
        keyboardShouldPersistTaps="handled">
        {isWriting ? (
          <TextInput
            style={[bookStyles.pageTextInput, {color: textColor}]}
            placeholder="Write whatever's on your mind…"
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(58,46,40,0.35)'}
            value={draftText}
            onChangeText={onChangeDraftText}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        ) : page.text ? (
          <Text style={[bookStyles.pageText, {color: textColor}]}>{page.text}</Text>
        ) : (
          <Text style={[bookStyles.pageTextEmpty, {color: textColor}]}>
            This page is blank — write, draw, or add a photo to bring it to life.
          </Text>
        )}
      </ScrollView>

      <DoodleLayer doodle={page.doodle} />

      {(page.photos || []).map(photo => (
        <DraggablePhoto
          key={photo.id}
          photo={photo}
          isActive={photoMode && activePhotoId === photo.id}
          onActivate={onActivatePhoto}
          onChange={onChangePhoto}
          onDelete={onDeletePhoto}
          locked={!photoMode}
        />
      ))}
    </View>
  );
};

// ─── Story Journal Book ──────────────────────────────────────────────────────
// The full-screen entry point. Pages slide horizontally like a real book;
// a "+" page always sits at the end so the user can start a fresh one
// whenever they like. Tools (write, draw, stickers, photo) act on whichever
// page is currently in view.

const StoryJournalBook = ({visible, onClose, token, accentColor}) => {
  const color = accentColor || ACCENT;
  const storageKey = useMemo(() => getStorageKey(token), [token]);

  const [pages, setPages] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const [isWriting, setIsWriting] = useState(false);
  const [draftText, setDraftText] = useState('');

  const [showDoodle, setShowDoodle] = useState(false);
  const [photoMode, setPhotoMode] = useState(false);
  const [activePhotoId, setActivePhotoId] = useState(null);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  const scrollRef = useRef(null);
  const pagesRef = useRef(pages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);

  // Load pages whenever the book is opened.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const loaded = await loadPages(storageKey);
      if (cancelled) return;
      setPages(loaded && loaded.length > 0 ? loaded : [blankPage()]);
      setIsLoaded(true);
      setPageIndex(0);
      setPhotoMode(false);
      setIsWriting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, storageKey]);

  // Persist on every change, once initial load has completed.
  useEffect(() => {
    if (!isLoaded || !visible) return;
    savePages(storageKey, pages);
  }, [pages, isLoaded, visible, storageKey]);

  const currentPage = pages[pageIndex];

  const updateCurrentPage = useCallback((updates) => {
    setPages(prev =>
      prev.map((p, i) =>
        i === pageIndex ? {...p, ...updates, updatedAt: Date.now()} : p,
      ),
    );
  }, [pageIndex]);

  const handleStartWriting = () => {
    setDraftText(currentPage?.text || '');
    setIsWriting(true);
  };

  const handleFinishWriting = () => {
    updateCurrentPage({text: draftText.trim()});
    setIsWriting(false);
  };

  const handleSaveDoodle = (doodleData) => {
    updateCurrentPage({doodle: doodleData});
  };

  const handleAddPhoto = async () => {
    if (isAddingPhoto) return;
    setIsAddingPhoto(true);
    try {
      const hasPermission = await requestPhotoPermission();
      if (!hasPermission) {
        Alert.alert('Photo access needed', 'Allow photo access in settings to add pictures to your journal.');
        return;
      }
      const result = await launchImageLibrary({
        mediaType: 'photo',
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.7,
        includeBase64: false,
      });
      if (result.didCancel || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      const newPhoto = {
        id: makePageId(),
        uri: asset.uri,
        x: PAGE_WIDTH / 2 - 65,
        y: 140,
        scale: 1,
      };
      setPages(prev =>
        prev.map((p, i) =>
          i === pageIndex
            ? {...p, photos: [...(p.photos || []), newPhoto], updatedAt: Date.now()}
            : p,
        ),
      );
      setActivePhotoId(newPhoto.id);
      setPhotoMode(true);
    } catch (err) {
      console.warn('Story Journal: photo pick failed', err);
    } finally {
      setIsAddingPhoto(false);
    }
  };

  const handleChangePhoto = (photoId, updates) => {
    setPages(prev =>
      prev.map((p, i) =>
        i === pageIndex
          ? {
              ...p,
              photos: (p.photos || []).map(ph => (ph.id === photoId ? {...ph, ...updates} : ph)),
              updatedAt: Date.now(),
            }
          : p,
      ),
    );
  };

  const handleDeletePhoto = (photoId) => {
    setPages(prev =>
      prev.map((p, i) =>
        i === pageIndex
          ? {...p, photos: (p.photos || []).filter(ph => ph.id !== photoId), updatedAt: Date.now()}
          : p,
      ),
    );
    setActivePhotoId(null);
  };

  const handleChangePaperColor = (c) => {
    updateCurrentPage({paperColor: c});
  };

  const handleNewPage = () => {
    const next = blankPage();
    let newIndex = 0;
    setPages(prev => {
      newIndex = prev.length;
      return [...prev, next];
    });
    setIsWriting(false);
    setPhotoMode(false);
    // Slide to the freshly created page once it's mounted.
    setTimeout(() => {
      scrollRef.current?.scrollTo({x: newIndex * SCREEN_W, animated: true});
      setPageIndex(newIndex);
    }, 50);
  };

  const handleDeletePage = () => {
    if (pages.length <= 1) {
      Alert.alert("That's your only page", 'Add a new page before deleting this one.');
      return;
    }
    Alert.alert('Delete this page?', 'This page and everything on it will be removed for good.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setPages(prev => prev.filter((_, i) => i !== pageIndex));
          const newIndex = Math.max(0, pageIndex - 1);
          setPageIndex(newIndex);
          setTimeout(() => {
            scrollRef.current?.scrollTo({x: newIndex * SCREEN_W, animated: false});
          }, 50);
        },
      },
    ]);
  };

  const handleScrollEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx === pages.length) {
      handleNewPage();
      return;
    }
    if (idx !== pageIndex) {
      setIsWriting(false);
      setPhotoMode(false);
      setActivePhotoId(null);
      setPageIndex(idx);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[bookStyles.screen, {backgroundColor: '#EFE3C8'}]}>
        {/* Header */}
        <View style={bookStyles.header}>
          <TouchableOpacity onPress={onClose} style={bookStyles.headerBtn}>
            <Icon name="chevron-left" size={26} color={INK} />
          </TouchableOpacity>
          <View style={bookStyles.headerTitleWrap}>
            <Icon name="book-open-page-variant" size={16} color={color} />
            <Text style={bookStyles.headerTitle}>Your Journal</Text>
          </View>
          <TouchableOpacity onPress={handleDeletePage} style={bookStyles.headerBtn}>
            <Icon name="trash-can-outline" size={20} color="#b08968" />
          </TouchableOpacity>
        </View>

        {!isLoaded ? (
          <View style={bookStyles.loadingWrap}>
            <ActivityIndicator size="small" color={color} />
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScrollEnd}
              scrollEnabled={!isWriting && !photoMode}
              contentOffset={{x: pageIndex * SCREEN_W, y: 0}}>
              {pages.map((page, i) => (
                <View key={page.id} style={{width: SCREEN_W}}>
                  <JournalPage
                    page={page}
                    pageNumber={i + 1}
                    isWriting={isWriting && i === pageIndex}
                    draftText={draftText}
                    onChangeDraftText={setDraftText}
                    photoMode={photoMode && i === pageIndex}
                    activePhotoId={activePhotoId}
                    onActivatePhoto={setActivePhotoId}
                    onChangePhoto={handleChangePhoto}
                    onDeletePhoto={handleDeletePhoto}
                  />
                </View>
              ))}
              {/* "+" page — always at the end, ready whenever the current one is full */}
              <TouchableOpacity
                style={[bookStyles.page, bookStyles.newPagePlaceholder]}
                activeOpacity={0.7}
                onPress={handleNewPage}>
                <Icon name="plus-circle-outline" size={40} color={color} />
                <Text style={[bookStyles.newPageText, {color}]}>Start a new page</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Page dots */}
            <View style={bookStyles.dotsRow}>
              {pages.map((p, i) => (
                <View
                  key={p.id}
                  style={[
                    bookStyles.dot,
                    i === pageIndex && {backgroundColor: color, width: 16},
                  ]}
                />
              ))}
              <View style={[bookStyles.dot, bookStyles.dotGhost]} />
            </View>

            {/* Toolbar */}
            {isWriting ? (
              <View style={bookStyles.writingBar}>
                <Text style={bookStyles.writingHint}>Writing on page {pageIndex + 1}</Text>
                <TouchableOpacity
                  style={[bookStyles.doneBtn, {backgroundColor: color}]}
                  onPress={handleFinishWriting}>
                  <Icon name="check" size={16} color="#fff" />
                  <Text style={bookStyles.doneBtnText}>Done writing</Text>
                </TouchableOpacity>
              </View>
            ) : photoMode ? (
              <View style={bookStyles.writingBar}>
                <Text style={bookStyles.writingHint}>Drag to move • pinch handle to resize</Text>
                <TouchableOpacity
                  style={[bookStyles.doneBtn, {backgroundColor: color}]}
                  onPress={() => {setPhotoMode(false); setActivePhotoId(null);}}>
                  <Icon name="check" size={16} color="#fff" />
                  <Text style={bookStyles.doneBtnText}>Done placing</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={bookStyles.toolbar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={bookStyles.paperColorScroll}>
                  {PAPER_COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => handleChangePaperColor(c)}
                      style={[
                        bookStyles.paperDot,
                        {backgroundColor: c},
                        currentPage?.paperColor === c && {borderWidth: 2, borderColor: color},
                      ]}
                    />
                  ))}
                </ScrollView>
                <View style={bookStyles.toolRow}>
                  <TouchableOpacity style={bookStyles.toolBtn} onPress={handleStartWriting}>
                    <Icon name="pencil-outline" size={20} color={INK} />
                    <Text style={bookStyles.toolBtnText}>Write</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={bookStyles.toolBtn} onPress={() => setShowDoodle(true)}>
                    <Icon name="draw" size={20} color={INK} />
                    <Text style={bookStyles.toolBtnText}>Draw</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={bookStyles.toolBtn}
                    onPress={handleAddPhoto}
                    disabled={isAddingPhoto}>
                    {isAddingPhoto ? (
                      <ActivityIndicator size="small" color={INK} />
                    ) : (
                      <Icon name="image-plus" size={20} color={INK} />
                    )}
                    <Text style={bookStyles.toolBtnText}>Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={bookStyles.toolBtn}
                    onPress={() => {
                      if ((currentPage?.photos || []).length === 0) return;
                      setActivePhotoId(currentPage.photos[currentPage.photos.length - 1].id);
                      setPhotoMode(true);
                    }}
                    disabled={(currentPage?.photos || []).length === 0}>
                    <Icon
                      name="cursor-move"
                      size={20}
                      color={(currentPage?.photos || []).length === 0 ? '#c9bfae' : INK}
                    />
                    <Text
                      style={[
                        bookStyles.toolBtnText,
                        (currentPage?.photos || []).length === 0 && {color: '#c9bfae'},
                      ]}>
                      Arrange
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={bookStyles.toolBtn} onPress={handleNewPage}>
                    <Icon name="plus-box-outline" size={20} color={INK} />
                    <Text style={bookStyles.toolBtnText}>New page</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        <DoodleCanvas
          visible={showDoodle}
          onClose={() => setShowDoodle(false)}
          onSave={handleSaveDoodle}
          accentColor={color}
          initialData={currentPage?.doodle}
        />
      </View>
    </Modal>
  );
};

const bookStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 12,
    backgroundColor: '#FBF6EC'  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {fontSize: 15, fontWeight: '800', color: INK},
  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBF6EC'},

  page: {
    flex: 1,
    marginHorizontal: PAGE_MARGIN,
    marginBottom: 12,
    borderRadius: 18,
    padding: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  paperLines: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  paperLine: {height: 1, width: '100%'},
  pageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pageNumber: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5},
  pageDate: {fontSize: 11, fontWeight: '600'},
  pageScroll: {flex: 1},
  pageScrollContent: {flexGrow: 1, paddingBottom: 20},
  pageText: {fontSize: 15, lineHeight: 24},
  pageTextEmpty: {fontSize: 14, lineHeight: 22, fontStyle: 'italic', opacity: 0.45},
  pageTextInput: {
    fontSize: 15,
    lineHeight: 26,
    minHeight: 200,
    padding: 0,
  },

  photoWrapper: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'visible',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoDelete: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  photoResizeHandle: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ACCENT,
  },

  doodleLayer: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  doodleSticker: {
    position: 'absolute',
  },

  newPagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 2,
    borderColor: 'rgba(58,46,40,0.15)',
    borderStyle: 'dashed',
  },
  newPageText: {fontSize: 14, fontWeight: '700'},

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(58,46,40,0.2)',
  },
  dotGhost: {opacity: 0.4},

  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    gap: 10,
    backgroundColor: '#FBF6EC'
  },
  paperColorScroll: {flexDirection: 'row'},
  paperDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(58,46,40,0.15)',
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toolBtn: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 58,
  },
  toolBtnText: {fontSize: 10, fontWeight: '700', color: INK},

  writingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,    
    backgroundColor: '#FBF6EC'
  },
  writingHint: {fontSize: 12, color: INK, opacity: 0.6, flex: 1},
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  doneBtnText: {color: '#fff', fontSize: 13, fontWeight: '700'},
});

export default StoryJournalBook;
