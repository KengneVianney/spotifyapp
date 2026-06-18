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
import { XIcon, HistoryIcon } from '../components/Icons';
import { catalogService } from '../services/catalogService';
import { supabase } from '../services/supabaseClient';
import type { Song } from '../types';

const SPOTIFY_GREEN = '#1DB954';

type ScreenProps = {
  onNavigate: (screen: 'discover' | 'nowplaying' | 'search' | 'library' | 'history') => void;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onTogglePlay: () => void;
  playbackProgress: number;
  isFavorite: (songId: string) => boolean;
  onToggleFavorite: (songId: string) => void;
};

type HistoryEntry = {
  id: string;
  song_id: string;
  duration_played_seconds: number;
  listened_at: string;
  song?: Song;
};

export default function HistoryScreen({
  onNavigate,
  currentSong,
  isPlaying,
  onPlaySong,
  onTogglePlay,
  playbackProgress,
  isFavorite,
  onToggleFavorite,
}: ScreenProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('play_history')
        .select('*')
        .eq('user_id', user.id)
        .order('listened_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data) { setLoading(false); return; }

      const allSongs = catalogService.getSongsSync();
      const enriched = data.map((entry: HistoryEntry) => ({
        ...entry,
        song: allSongs.find(s => s.id === entry.song_id),
      }));
      setEntries(enriched);
    } catch {
      // Silently fail
    }
    setLoading(false);
  };

  useEffect(() => { loadHistory(); }, []);

  const songHistory = entries.filter(e => e.song);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('library')}>
          <XIcon size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique d'écoute</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={SPOTIFY_GREEN} style={{ marginTop: 60 }} />
      ) : songHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <HistoryIcon size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyTitle}>Aucun historique</Text>
          <Text style={styles.emptyText}>Écoute des morceaux pour voir ton historique apparaître ici.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {songHistory.map((entry, idx) => {
            const song = entry.song!;
            const globalIdx = catalogService.getSongsSync().findIndex(s => s.id === song.id);
            const isCurrent = currentSong?.id === song.id;
            const date = new Date(entry.listened_at);
            const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

            return (
              <TouchableOpacity
                key={entry.id}
                style={[styles.row, isCurrent && styles.rowActive]}
                onPress={() => onPlaySong(song, songHistory.map(e => e.song!))}
              >
                <Image source={catalogService.getCoverForIndex(globalIdx >= 0 ? globalIdx : 0)} style={styles.cover} />
                <View style={styles.info}>
                  <Text style={[styles.title, isCurrent && styles.titleActive]} numberOfLines={1}>{song.title}</Text>
                  <Text style={styles.artist} numberOfLines={1}>{song.artist?.name ?? 'Inconnu'}</Text>
                  <Text style={styles.date}>Écouté le {dateStr} · {Math.round(entry.duration_played_seconds / 60)} min</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {currentSong ? (
        <View style={styles.miniPlayer}>
          <TouchableOpacity style={styles.miniInner} onPress={() => onNavigate('nowplaying')}>
            <Image source={catalogService.getCoverForIndex(catalogService.getSongsSync().findIndex(s => s.id === currentSong.id))} style={styles.miniCover} />
            <View style={styles.miniInfo}>
              <Text style={styles.miniTitle} numberOfLines={1}>{currentSong.title}</Text>
              <Text style={styles.miniArtist} numberOfLines={1}>{currentSong.artist?.name ?? ''}</Text>
            </View>
            <TouchableOpacity style={styles.miniPlayBtn} onPress={onTogglePlay}>
              <Text style={styles.miniPlayText}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20 },
  list: { paddingHorizontal: 24, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, gap: 12 },
  rowActive: { backgroundColor: 'rgba(29, 185, 84, 0.1)' },
  cover: { width: 48, height: 48, borderRadius: 8 },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#fff' },
  titleActive: { color: SPOTIFY_GREEN },
  artist: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  date: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  miniPlayer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingBottom: 24, backgroundColor: 'rgba(10,10,18,0.95)' },
  miniInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 30, 50, 0.92)', borderRadius: 16, padding: 10, gap: 10 },
  miniCover: { width: 42, height: 42, borderRadius: 8 },
  miniInfo: { flex: 1 },
  miniTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  miniArtist: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  miniPlayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: SPOTIFY_GREEN, alignItems: 'center', justifyContent: 'center' },
  miniPlayText: { fontSize: 16, color: '#fff' },
});
