import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { XIcon, ShareIcon2, HeartIcon, HistoryIcon, TrendingIcon } from '../components/Icons';
import { musicService } from '../services/musicService';
import { useTheme } from '../context/ThemeContext';
import type { Song } from '../types';

type ScreenProps = {
  onNavigate: (screen: 'discover' | 'library' | 'nowplaying') => void;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, queue: Song[]) => void;
  isFavorite: (songId: string) => boolean;
};

export default function ProfileScreen({
  onNavigate,
  currentSong,
  isPlaying,
  onPlaySong,
  isFavorite,
}: ScreenProps) {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<{ email: string; id: string } | null>(null);
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>([]);

  useEffect(() => {
    (async () => {
      const p = await musicService.getUserProfile();
      setProfile(p);
      const favs = await musicService.getFavoriteSongs();
      setFavoriteSongs(favs);
    })();
  }, []);

  const handleShareProfile = async () => {
    if (!profile) return;
    try {
      await Share.share({
        title: 'Mon profil Kabod Music',
        message: `🎵 Rejoins-moi sur Kabod Music !\n\nProfil: kabodmusic://profile/${profile.id}\nEmail: ${profile.email}`,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('library')}>
          <XIcon size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mon Profil</Text>
        <TouchableOpacity onPress={handleShareProfile}>
          <ShareIcon2 size={22} color="#1DB954" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.email?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
        </View>
        <Text style={[styles.email, { color: colors.text }]}>{profile?.email ?? 'Chargement...'}</Text>
        <Text style={[styles.stats, { color: colors.textSecondary }]}>
          {favoriteSongs.length} titres favoris
        </Text>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShareProfile}>
          <ShareIcon2 size={18} color="#fff" />
          <Text style={styles.shareBtnText}>Partager mon profil</Text>
        </TouchableOpacity>

        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickLink} onPress={() => onNavigate('discover')}>
            <TrendingIcon size={20} color="#1DB954" />
            <Text style={styles.quickLinkText}>Découvrir</Text>
          </TouchableOpacity>
        </View>

        {favoriteSongs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes favoris</Text>
            {favoriteSongs.slice(0, 10).map((song, idx) => {
              const isCur = currentSong?.id === song.id;
              return (
                <TouchableOpacity
                  key={song.id}
                  style={[styles.songRow, isCur && styles.songRowActive]}
                  onPress={() => onPlaySong(song, favoriteSongs)}
                >
                  <HeartIcon size={14} color="#1DB954" fill />
                  <View style={styles.songInfo}>
                    <Text style={[styles.songTitle, isCur && styles.songTitleActive, { color: colors.text }]} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                      {song.artist?.name ?? ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 24, alignItems: 'center' },
  avatarWrap: { marginTop: 24, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1DB954', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  email: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  stats: { fontSize: 13, marginBottom: 20 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1DB954', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 24, gap: 8, marginBottom: 24 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  quickLinks: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, gap: 8 },
  quickLinkText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '700', alignSelf: 'flex-start', marginBottom: 12 },
  songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12, gap: 10, alignSelf: 'stretch' },
  songRowActive: { backgroundColor: 'rgba(29, 185, 84, 0.1)' },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 14, fontWeight: '600' },
  songTitleActive: { color: '#1DB954' },
  songArtist: { fontSize: 11, marginTop: 2 },
});
