import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { XIcon, TrendingIcon, PlayIcon, HeartIcon } from '../components/Icons';
import { catalogService } from '../services/catalogService';
import { musicService } from '../services/musicService';
import { useTheme } from '../context/ThemeContext';
import type { Song } from '../types';

const ITEMS_PER_PAGE = 20;

type ScreenProps = {
  onNavigate: (screen: 'discover' | 'nowplaying' | 'library') => void;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, queue: Song[]) => void;
  isFavorite: (songId: string) => boolean;
  onToggleFavorite: (songId: string) => void;
};

export default function TopChartsScreen({
  onNavigate,
  currentSong,
  isPlaying,
  onPlaySong,
  isFavorite,
  onToggleFavorite,
}: ScreenProps) {
  const { colors } = useTheme();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await musicService.getTopCharts(ITEMS_PER_PAGE * 2);
      setSongs(data.slice(0, ITEMS_PER_PAGE * page));
      setLoading(false);
    })();
  }, [page]);

  const allSongs = catalogService.getSongsSync();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('library')}>
          <XIcon size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <TrendingIcon size={22} color="#1DB954" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Top Charts</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {loading && page === 1 ? (
        <ActivityIndicator size="large" color="#1DB954" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {songs.map((song, idx) => {
            const globalIdx = allSongs.findIndex(s => s.id === song.id);
            const isCur = currentSong?.id === song.id;
            return (
              <TouchableOpacity
                key={song.id}
                style={[styles.songRow, isCur && styles.songRowActive]}
                onPress={() => onPlaySong(song, songs)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rank, idx < 3 && styles.rankGold]}>{idx + 1}</Text>
                <Image
                  source={catalogService.getCoverForIndex(globalIdx >= 0 ? globalIdx : idx)}
                  style={styles.songCover}
                />
                <View style={styles.songInfo}>
                  <Text style={[styles.songTitle, isCur && styles.songTitleActive, { color: colors.text }]} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                    {song.artist?.name ?? ''}
                  </Text>
                </View>
                <View style={styles.songActions}>
                  <Text style={styles.playCount}>{song.play_count ?? 0}</Text>
                  <TouchableOpacity onPress={() => onToggleFavorite(song.id)}>
                    <HeartIcon
                      size={18}
                      color={isFavorite(song.id) ? '#1DB954' : 'rgba(255,255,255,0.4)'}
                      fill={isFavorite(song.id)}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
          {songs.length >= ITEMS_PER_PAGE * page && (
            <TouchableOpacity style={styles.loadMore} onPress={() => setPage(p => p + 1)}>
              <Text style={styles.loadMoreText}>Charger plus</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  list: { paddingHorizontal: 24, gap: 4 },
  songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, gap: 12 },
  songRowActive: { backgroundColor: 'rgba(29, 185, 84, 0.1)' },
  rank: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.4)', width: 28, textAlign: 'center' },
  rankGold: { color: '#FFD700' },
  songCover: { width: 44, height: 44, borderRadius: 8 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 14, fontWeight: '600' },
  songTitleActive: { color: '#1DB954' },
  songArtist: { fontSize: 11, marginTop: 2 },
  songActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playCount: { fontSize: 11, color: '#1DB954', fontWeight: '600' },
  loadMore: { alignItems: 'center', paddingVertical: 16 },
  loadMoreText: { color: '#1DB954', fontWeight: '600', fontSize: 14 },
});
