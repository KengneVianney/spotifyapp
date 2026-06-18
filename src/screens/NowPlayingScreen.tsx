import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  ScrollView,
  FlatList,
  type ViewStyle,
  type ImageStyle,
} from 'react-native';
import Video, { type OnLoadData, type OnProgressData, type ReactVideoSource } from 'react-native-video';
import {
  ChevronDownIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  ShuffleIcon,
  RepeatIcon,
  HeartIcon,
  ListMusicIcon,
  MicIcon,
  Equalizer,
  ClockIcon,
  XIcon,
  TrashIcon,
  RadioIcon,
  LyricsIcon,
} from '../components/Icons';
import { catalogService } from '../services/catalogService';
import { musicService } from '../services/musicService';
import { useTheme } from '../context/ThemeContext';
import type { Song, Lyrics } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');
const VINYL_SIZE = SCREEN_W * 0.68;
const SPOTIFY_GREEN = '#1DB954';

const SLEEP_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 h', value: 60 },
  { label: 'Fin du titre', value: -1 },
];

type RadioFilter = { type: 'artist' | 'album'; id: string } | null;

type ScreenProps = {
  onNavigate: (screen: 'nowplaying' | 'discover' | 'search' | 'library') => void;
  currentSong: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onTrackEnded: () => void;
  onProgressUpdate: (percent: number) => void;
  isFavorite: (songId: string) => boolean;
  onToggleFavorite: (songId: string) => void;
  queue: Song[];
  setQueue: (songs: Song[]) => void;
  setCurrentSong: (song: Song) => void;
  radioMode: boolean;
  setRadioMode: (v: boolean) => void;
  radioFilter?: RadioFilter;
  setRadioFilter?: (f: RadioFilter) => void;
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function NowPlayingScreen({
  onNavigate,
  currentSong,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  onTrackEnded,
  onProgressUpdate,
  isFavorite,
  onToggleFavorite,
  queue,
  setQueue,
  setCurrentSong,
  radioMode,
  setRadioMode,
  radioFilter,
  setRadioFilter,
}: ScreenProps) {
  const { colors } = useTheme();
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const loggedPlayRef = useRef(false);

  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!currentSong) return;
    setPosition(0);
    setDuration(currentSong.duration_seconds ?? 0);
    setAudioError(null);
    loggedPlayRef.current = false;
    setLyrics(null);
  }, [currentSong]);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }),
      ).start();
    } else {
      spinAnim.stopAnimation();
    }
    return () => spinAnim.stopAnimation();
  }, [isPlaying, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressPercent = useMemo(() => {
    if (!duration) return 0;
    return Math.max(0, Math.min(100, (position / duration) * 100));
  }, [position, duration]);

  const songIndex = useMemo(() => {
    if (!currentSong) return 0;
    const idx = catalogService.getSongsSync().findIndex(s => s.id === currentSong.id);
    return idx >= 0 ? idx : 0;
  }, [currentSong]);

  const currentCover = useMemo(() => catalogService.getCoverForIndex(songIndex), [songIndex]);

  const audioSource = useMemo(() => {
    if (!currentSong) return null;
    return catalogService.getAudioSource(currentSong.id);
  }, [currentSong]);

  const handleProgress = (data: OnProgressData) => {
    setPosition(data.currentTime);
    const total = duration || currentSong?.duration_seconds || 1;
    onProgressUpdate(Math.max(0, Math.min(100, (data.currentTime / total) * 100)));

    if (currentSong && !loggedPlayRef.current && data.currentTime >= 30) {
      loggedPlayRef.current = true;
      musicService.logPlayHistory(currentSong.id, Math.floor(data.currentTime)).catch(() => {});
    }
  };

  const handleLoad = (data: OnLoadData) => {
    if (Number.isFinite(data.duration) && data.duration > 0) {
      setDuration(data.duration);
    }
  };

  const removeFromQueue = useCallback((songId: string) => {
    setQueue(queue.filter(s => s.id !== songId));
  }, [queue, setQueue]);

  const playFromQueue = useCallback((song: Song) => {
    setCurrentSong(song);
    setShowQueue(false);
  }, [setCurrentSong]);

  const moveInQueue = useCallback((fromIndex: number, toIndex: number) => {
    const newQueue = [...queue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);
    setQueue(newQueue);
  }, [queue, setQueue]);

  const setSleepTimer = useCallback((minutes: number) => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    if (minutes === -1) {
      setSleepTimerRemaining(-1);
    } else {
      setSleepTimerRemaining(minutes * 60);
      const interval = setInterval(() => {
        setSleepTimerRemaining(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            onTogglePlay();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      sleepTimerRef.current = setTimeout(() => {
        onTogglePlay();
        setSleepTimerRemaining(null);
      }, minutes * 60 * 1000);
    }
    setShowSleepTimer(false);
  }, [onTogglePlay]);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    setSleepTimerRemaining(null);
  }, []);

  const openLyrics = useCallback(async () => {
    setShowLyrics(true);
    if (!currentSong || lyrics) return;
    setLyricsLoading(true);
    const data = await musicService.getLyrics(currentSong.id);
    setLyrics(data);
    setLyricsLoading(false);
  }, [currentSong, lyrics]);

  const handleRadioFilter = useCallback(() => {
    if (!currentSong) return;
    if (radioFilter) {
      setRadioFilter?.(null);
      setRadioMode(false);
    } else {
      const artistId = currentSong.artist_id;
      if (artistId) {
        setRadioFilter?.({ type: 'artist', id: artistId });
        setRadioMode(true);
      }
    }
  }, [currentSong, radioFilter, setRadioFilter, setRadioMode]);

  if (!currentSong) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.emptyIconWrap}><Text style={styles.emptyIcon}>🎵</Text></View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun titre en lecture</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Choisis une musique depuis Discover pour lancer la lecture.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('discover')}>
          <Text style={styles.backButtonText}>Retour au catalogue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentIndex = queue.findIndex(s => s.id === currentSong.id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {audioSource ? (
        <Video
          source={audioSource as unknown as ReactVideoSource}
          paused={!isPlaying}
          playInBackground
          playWhenInactive
          onProgress={handleProgress}
          onLoad={handleLoad}
          onEnd={onTrackEnded}
          onError={event => {
            setAudioError('Erreur de lecture audio.');
            console.error('Audio playback error:', event);
          }}
          style={styles.hiddenPlayer}
        />
      ) : null}

      {/* Queue Modal */}
      <Modal visible={showQueue} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>File d'attente ({queue.length})</Text>
              <TouchableOpacity onPress={() => setShowQueue(false)}>
                <XIcon size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={queue}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => {
                const isCurrent = item.id === currentSong.id;
                const globalIdx = catalogService.getSongsSync().findIndex(s => s.id === item.id);
                return (
                  <TouchableOpacity
                    style={[styles.queueItem, isCurrent && styles.queueItemActive]}
                    onPress={() => playFromQueue(item)}
                  >
                    <Image source={catalogService.getCoverForIndex(globalIdx >= 0 ? globalIdx : 0)} style={styles.queueCover} />
                    <View style={styles.queueInfo}>
                      <Text style={[styles.queueTitle, isCurrent && styles.queueTitleActive, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={[styles.queueArtist, { color: colors.textSecondary }]} numberOfLines={1}>{item.artist?.name ?? 'Inconnu'}</Text>
                    </View>
                    {!isCurrent && (
                      <TouchableOpacity onPress={() => removeFromQueue(item.id)} hitSlop={8}>
                        <TrashIcon size={18} color="rgba(255,255,255,0.4)" />
                      </TouchableOpacity>
                    )}
                    {isCurrent && <Text style={styles.queueNowLabel}>En cours</Text>}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.queueList}
            />
          </View>
        </View>
      </Modal>

      {/* Lyrics Modal */}
      <Modal visible={showLyrics} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Paroles</Text>
              <TouchableOpacity onPress={() => setShowLyrics(false)}>
                <XIcon size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.lyricsContent}>
              <Text style={[styles.lyricsTitle, { color: colors.text }]}>{currentSong.title}</Text>
              <Text style={[styles.lyricsArtist, { color: colors.textSecondary }]}>{currentSong.artist?.name ?? ''}</Text>
              <View style={styles.lyricsDivider} />
              {lyricsLoading ? (
                <Text style={[styles.lyricsText, { color: colors.textSecondary }]}>Chargement...</Text>
              ) : lyrics ? (
                <Text style={[styles.lyricsText, { color: colors.textSecondary }]}>
                  {lyrics.content}
                </Text>
              ) : (
                <Text style={[styles.lyricsText, { color: colors.textSecondary }]}>
                  Les paroles ne sont pas encore disponibles pour ce titre.{'\n\n'}
                  Kabod Music travaille à l'intégration des paroles pour tous les morceaux.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sleep Timer Modal */}
      <Modal visible={showSleepTimer} animationType="fade" transparent>
        <TouchableOpacity style={styles.sleepOverlay} activeOpacity={1} onPress={() => setShowSleepTimer(false)}>
          <View style={[styles.sleepSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sleepTitle, { color: colors.text }]}>Minuteur de sommeil</Text>
            {sleepTimerRemaining !== null && (
              <TouchableOpacity style={styles.sleepCancelBtn} onPress={cancelSleepTimer}>
                <Text style={styles.sleepCancelText}>
                  Annuler ({sleepTimerRemaining === -1 ? 'Fin du titre' : formatTime(sleepTimerRemaining)})
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.sleepOptions}>
              {SLEEP_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} style={styles.sleepOption} onPress={() => setSleepTimer(opt.value)}>
                  <Text style={styles.sleepOptionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.backgroundGrad} />
      <View style={styles.ambientBlobTop} />
      <View style={styles.ambientBlobBottom} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => onNavigate('discover')}>
          <ChevronDownIcon size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarSub}>En lecture</Text>
          <Text style={[styles.topBarTitle, { color: colors.text }]} numberOfLines={1}>
            {currentSong.album?.title ?? currentSong.artist?.name ?? ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSleepTimer(true)}>
          <ClockIcon size={18} color={sleepTimerRemaining !== null ? SPOTIFY_GREEN : colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.vinylWrapper}>
        <View style={styles.vinylGlow} />
        <Animated.View style={[styles.vinyl, { transform: [{ rotate: spin }] }]}>
          <View style={styles.groove1} />
          <View style={styles.groove2} />
          <View style={styles.groove3} />
          <View style={styles.albumArtContainer}>
            <Image source={currentCover} style={styles.albumArt} />
          </View>
          <View style={styles.spindle} />
        </Animated.View>
      </View>

      <View style={styles.trackMeta}>
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>{currentSong.title}</Text>
          <Text style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
            {currentSong.artist?.name ?? 'Artiste inconnu'}
            {currentSong.album?.title ? ` · ${currentSong.album.title}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => currentSong && onToggleFavorite(currentSong.id)}>
          <HeartIcon
            size={26}
            color={currentSong && isFavorite(currentSong.id) ? SPOTIFY_GREEN : 'rgba(255,255,255,0.7)'}
            fill={currentSong ? isFavorite(currentSong.id) : false}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          <View style={[styles.progressThumb, { left: `${progressPercent}%` }]} />
        </View>
        <View style={styles.progressTimes}>
          <Text style={styles.progressTime}>{formatTime(position)}</Text>
          <Text style={styles.progressTime}>{formatTime(duration || currentSong.duration_seconds)}</Text>
        </View>
      </View>

      {audioError ? <Text style={styles.audioError}>{audioError}</Text> : null}

      <View style={styles.controls}>
        <TouchableOpacity onPress={() => setRadioMode(!radioMode)}>
          <ShuffleIcon size={22} color={radioMode ? SPOTIFY_GREEN : 'rgba(255,255,255,0.7)'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPrevious}><SkipBackIcon size={28} color={colors.text} /></TouchableOpacity>
        <TouchableOpacity style={styles.playBtn} onPress={onTogglePlay}>
          {isPlaying ? <PauseIcon size={30} color="#fff" /> : <PlayIcon size={30} color="#fff" />}
        </TouchableOpacity>
        <TouchableOpacity onPress={onNext}><SkipForwardIcon size={28} color={colors.text} /></TouchableOpacity>
        <TouchableOpacity onPress={handleRadioFilter}>
          <RadioIcon size={22} color={radioFilter ? SPOTIFY_GREEN : 'rgba(255,255,255,0.7)'} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomItem} onPress={() => setShowQueue(true)}>
          <ListMusicIcon size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.bottomText}>Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomItem} onPress={openLyrics}>
          <LyricsIcon size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.bottomText}>Paroles</Text>
        </TouchableOpacity>
        <Equalizer size={16} color={SPOTIFY_GREEN} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenPlayer: { position: 'absolute', width: 1, height: 1, opacity: 0 } as ViewStyle,
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 } as ViewStyle,
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(29, 185, 84, 0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 } as ViewStyle,
  emptyIcon: { fontSize: 36 } as ViewStyle,
  emptyTitle: { fontSize: 24, fontWeight: '700' } as ViewStyle,
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 } as ViewStyle,
  backButton: { marginTop: 16, backgroundColor: SPOTIFY_GREEN, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 } as ViewStyle,
  backButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 } as ViewStyle,
  container: { flex: 1 } as ViewStyle,
  backgroundGrad: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0A0A12' } as ViewStyle,
  ambientBlobTop: { position: 'absolute', top: -100, left: -100, width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(29, 185, 84, 0.08)' } as ViewStyle,
  ambientBlobBottom: { position: 'absolute', bottom: -120, right: -120, width: 460, height: 460, borderRadius: 230, backgroundColor: 'rgba(29, 185, 84, 0.06)' } as ViewStyle,
  topBar: { height: 56, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 } as ViewStyle,
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' } as ViewStyle,
  topBarCenter: { alignItems: 'center', maxWidth: '70%' } as ViewStyle,
  topBarSub: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' } as ViewStyle,
  topBarTitle: { fontSize: 13, fontWeight: '600' } as ViewStyle,
  vinylWrapper: { alignItems: 'center', marginTop: 24 } as ViewStyle,
  vinylGlow: { position: 'absolute', width: VINYL_SIZE + 40, height: VINYL_SIZE + 40, borderRadius: (VINYL_SIZE + 40) / 2, backgroundColor: 'rgba(29, 185, 84, 0.12)', top: -20 } as ViewStyle,
  vinyl: { width: VINYL_SIZE, height: VINYL_SIZE, borderRadius: VINYL_SIZE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e' } as ViewStyle,
  groove1: { position: 'absolute', width: VINYL_SIZE - 24, height: VINYL_SIZE - 24, borderRadius: (VINYL_SIZE - 24) / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' } as ViewStyle,
  groove2: { position: 'absolute', width: VINYL_SIZE - 48, height: VINYL_SIZE - 48, borderRadius: (VINYL_SIZE - 48) / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' } as ViewStyle,
  groove3: { position: 'absolute', width: VINYL_SIZE - 80, height: VINYL_SIZE - 80, borderRadius: (VINYL_SIZE - 80) / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' } as ViewStyle,
  albumArtContainer: { width: VINYL_SIZE * 0.54, height: VINYL_SIZE * 0.54, borderRadius: VINYL_SIZE * 0.27, overflow: 'hidden' } as ViewStyle,
  albumArt: { width: '100%', height: '100%' } as ImageStyle,
  spindle: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#000', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' } as ViewStyle,
  trackMeta: { paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 } as ViewStyle,
  trackInfo: { flex: 1, marginRight: 12 } as ViewStyle,
  trackTitle: { fontSize: 22, fontWeight: '700' } as ViewStyle,
  trackArtist: { fontSize: 14, marginTop: 4 } as ViewStyle,
  progressSection: { paddingHorizontal: 28, marginTop: 20 } as ViewStyle,
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', position: 'relative' } as ViewStyle,
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: SPOTIFY_GREEN, borderRadius: 2 } as ViewStyle,
  progressThumb: { position: 'absolute', top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' } as ViewStyle,
  progressTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 } as ViewStyle,
  progressTime: { fontSize: 11, color: 'rgba(255,255,255,0.55)' } as ViewStyle,
  audioError: { color: '#f87171', fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 28 } as ViewStyle,
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginHorizontal: 20, backgroundColor: 'rgba(30, 30, 50, 0.65)', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' } as ViewStyle,
  playBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: SPOTIFY_GREEN, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, position: 'absolute', bottom: 34, left: 20, right: 20 } as ViewStyle,
  bottomItem: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  bottomText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' } as ViewStyle,

  // Modal styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' } as ViewStyle,
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 40 } as ViewStyle,
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginTop: 12, marginBottom: 8 } as ViewStyle,
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 } as ViewStyle,
  modalTitle: { fontSize: 18, fontWeight: '700' } as ViewStyle,
  queueList: { paddingHorizontal: 24, gap: 4 } as ViewStyle,
  queueItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, gap: 12 } as ViewStyle,
  queueItemActive: { backgroundColor: 'rgba(29, 185, 84, 0.1)' } as ViewStyle,
  queueCover: { width: 44, height: 44, borderRadius: 8 } as ImageStyle,
  queueInfo: { flex: 1 } as ViewStyle,
  queueTitle: { fontSize: 14, fontWeight: '600' } as ViewStyle,
  queueTitleActive: { color: SPOTIFY_GREEN } as ViewStyle,
  queueArtist: { fontSize: 11, marginTop: 2 } as ViewStyle,
  queueNowLabel: { fontSize: 11, color: SPOTIFY_GREEN, fontWeight: '600' } as ViewStyle,
  lyricsContent: { padding: 24, alignItems: 'center' } as ViewStyle,
  lyricsTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' } as ViewStyle,
  lyricsArtist: { fontSize: 14, marginTop: 4 } as ViewStyle,
  lyricsDivider: { width: 40, height: 2, backgroundColor: SPOTIFY_GREEN, marginVertical: 20, borderRadius: 1 } as ViewStyle,
  lyricsText: { fontSize: 15, lineHeight: 24, textAlign: 'center' } as ViewStyle,
  sleepOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' } as ViewStyle,
  sleepSheet: { borderRadius: 20, padding: 24, width: '80%', maxWidth: 320, alignItems: 'center' } as ViewStyle,
  sleepTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 } as ViewStyle,
  sleepCancelBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, marginBottom: 16 } as ViewStyle,
  sleepCancelText: { color: SPOTIFY_GREEN, fontSize: 13, fontWeight: '600' } as ViewStyle,
  sleepOptions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 } as ViewStyle,
  sleepOption: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' } as ViewStyle,
  sleepOptionText: { color: '#fff', fontSize: 14, fontWeight: '600' } as ViewStyle,
});
