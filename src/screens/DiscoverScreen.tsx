import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { PlayIcon, SearchIcon, RadioIcon } from '../components/Icons';
import BottomTabBar from '../components/BottomTabBar';
import MiniPlayer from '../components/MiniPlayer';
import { catalogService } from '../services/catalogService';
import { useTheme } from '../context/ThemeContext';
import type { Song } from '../types';

const SPOTIFY_GREEN = '#1DB954';

type AppScreen = 'discover' | 'nowplaying' | 'search' | 'library';

type ScreenProps = {
  onNavigate: (screen: AppScreen) => void;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onTogglePlay: () => void;
  playbackProgress: number;
  isFavorite: (songId: string) => boolean;
  onToggleFavorite: (songId: string) => void;
  setRadioMode?: (v: boolean) => void;
  setRadioFilter?: (f: { type: 'artist' | 'album'; id: string } | null) => void;
};

export default function DiscoverScreen({
  onNavigate,
  currentSong,
  isPlaying,
  onPlaySong,
  onTogglePlay,
  playbackProgress,
  isFavorite,
  onToggleFavorite,
  setRadioMode,
  setRadioFilter,
}: ScreenProps) {
  const { colors } = useTheme();
  const songs = catalogService.getSongsSync();
  const heroSong = useMemo(() => songs[0] ?? null, [songs]);

  const featuredArtists = useMemo(() => {
    const artistMap = new Map<string, { name: string; artist_id: string; count: number }>();
    songs.forEach(s => {
      const name = s.artist?.name ?? 'Inconnu';
      const id = s.artist_id;
      if (!artistMap.has(id)) artistMap.set(id, { name, artist_id: id, count: 1 });
      else artistMap.get(id)!.count++;
    });
    return Array.from(artistMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6);
  }, [songs]);

  const startRadioByArtist = (artistId: string) => {
    const artistSongs = songs.filter(s => s.artist_id === artistId);
    if (artistSongs.length > 0) {
      setRadioMode?.(true);
      setRadioFilter?.({ type: 'artist', id: artistId });
      onPlaySong(artistSongs[0], artistSongs);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Bienvenue</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Découvrir</Text>
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={() => onNavigate('search')}>
            <SearchIcon size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {heroSong ? (
          <View style={styles.heroCard}>
            <Image source={catalogService.getCoverForIndex(0)} style={styles.heroBg} />
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>À la une</Text>
              </View>
              <View style={styles.heroTextGroup}>
                <Text style={styles.heroText} numberOfLines={2}>
                  {heroSong.title}
                </Text>
                <Text style={styles.heroMeta} numberOfLines={1}>
                  {heroSong.artist?.name ?? 'Artiste inconnu'} ·{' '}
                  {Math.round(heroSong.duration_seconds / 60)} min
                </Text>
              </View>
              <TouchableOpacity
                style={styles.heroPlayBtn}
                onPress={() => onPlaySong(heroSong, songs)}>
                <PlayIcon size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Artistes populaires</Text>
          <TouchableOpacity onPress={() => onNavigate('library')}>
            <Text style={styles.sectionSeeAll}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.artistsRow}>
          {featuredArtists.map(([id, { name, count, artist_id }], idx) => (
            <TouchableOpacity key={id} style={styles.artistCard} onPress={() => onNavigate('library')}>
              <View
                style={[
                  styles.artistAvatar,
                  { backgroundColor: ARTIST_COLORS[idx % ARTIST_COLORS.length] },
                ]}>
                <Text style={styles.artistInitial}>{name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.artistName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.artistSongCount}>
                {count} titre{count > 1 ? 's' : ''}
              </Text>
              <TouchableOpacity style={styles.artistRadioBtn} onPress={() => startRadioByArtist(artist_id)}>
                <RadioIcon size={14} color="#fff" />
                <Text style={styles.artistRadioText}>Radio</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tous les titres</Text>
          <Text style={styles.sectionSeeAll}>{songs.length} titres</Text>
        </View>

        <View style={styles.grid}>
          {songs.map((song, index) => (
            <TouchableOpacity
              key={song.id}
              style={styles.gridCard}
              onPress={() => onPlaySong(song, songs)}
              activeOpacity={0.85}>
              <Image source={catalogService.getCoverForIndex(index)} style={styles.gridImage} />
              <View style={styles.gridInfo}>
                <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text style={[styles.gridArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                  {song.artist?.name ?? 'Artiste inconnu'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {currentSong ? (
        <MiniPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          isLiked={isFavorite(currentSong.id)}
          progressPercent={playbackProgress}
          onOpenNowPlaying={() => onNavigate('nowplaying')}
          onTogglePlay={onTogglePlay}
          onToggleLike={() => onToggleFavorite(currentSong.id)}
        />
      ) : null}

      <BottomTabBar active="discover" onNavigate={onNavigate} />
    </View>
  );
}

const ARTIST_COLORS = ['#1DB954', '#E91E63', '#FF9800', '#2196F3', '#9C27B0', '#00BCD4'];

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSub: { fontSize: 12 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroCard: {
    marginHorizontal: 24,
    marginTop: 20,
    height: 190,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroBg: { position: 'absolute', width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroContent: { flex: 1, padding: 18, justifyContent: 'space-between' },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(29, 185, 84, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroBadgeText: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#fff',
    fontWeight: '600',
  },
  heroTextGroup: { position: 'absolute', bottom: 18, left: 18 },
  heroText: { fontSize: 22, fontWeight: '700', color: '#fff', lineHeight: 28 },
  heroMeta: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  heroPlayBtn: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: SPOTIFY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistsRow: { paddingHorizontal: 24, gap: 14 },
  artistCard: { alignItems: 'center', width: 80 },
  artistAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  artistInitial: { fontSize: 24, fontWeight: '700', color: '#fff' },
  artistName: { fontSize: 11, fontWeight: '600', color: '#fff', textAlign: 'center' },
  artistSongCount: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  artistRadioBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6, backgroundColor: 'rgba(29, 185, 84, 0.15)', borderRadius: 12, paddingVertical: 3, paddingHorizontal: 8 },
  artistRadioText: { fontSize: 9, color: '#fff', fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionSeeAll: { fontSize: 12, color: SPOTIFY_GREEN, fontWeight: '500' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 10,
  },
  gridCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 6,
    gap: 8,
  },
  gridImage: { width: 46, height: 46, borderRadius: 8 },
  gridInfo: { flex: 1 },
  gridTitle: { fontSize: 12, fontWeight: '600' },
  gridArtist: { fontSize: 10, marginTop: 2 },
});
