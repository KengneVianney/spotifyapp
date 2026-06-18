import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { XIcon, PlusIcon, PlayIcon, ShareIcon2, HeartIcon } from '../components/Icons';
import { catalogService } from '../services/catalogService';
import { musicService } from '../services/musicService';
import { useTheme } from '../context/ThemeContext';
import type { Song, Playlist } from '../types';

const SPOTIFY_GREEN = '#1DB954';

type ScreenProps = {
  onNavigate: (screen: 'discover' | 'nowplaying' | 'search' | 'library' | 'playlistmanage') => void;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onTogglePlay: () => void;
  playbackProgress: number;
  favoriteIds: string[];
  isFavorite: (songId: string) => boolean;
  onToggleFavorite: (songId: string) => void;
};

export default function PlaylistManageScreen({
  onNavigate,
  currentSong,
  isPlaying,
  onPlaySong,
  onTogglePlay,
  playbackProgress,
  favoriteIds,
  isFavorite,
  onToggleFavorite,
}: ScreenProps) {
  const { colors } = useTheme();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [showAddSong, setShowAddSong] = useState(false);

  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await musicService.getPlaylists();
      setPlaylists(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadPlaylists(); }, [loadPlaylists]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await musicService.createPlaylist(newName.trim());
      setNewName('');
      setShowCreate(false);
      await loadPlaylists();
    } catch (e) {
      Alert.alert('Erreur', "Impossible de créer la playlist.");
    }
    setCreating(false);
  }, [newName, loadPlaylists]);

  const handleSelectPlaylist = useCallback(async (pl: Playlist) => {
    setSelectedPlaylist(pl);
    try {
      const songs = await musicService.getPlaylistSongs(pl.id);
      setPlaylistSongs(songs);
    } catch {
      setPlaylistSongs([]);
    }
  }, []);

  const handleAddSongToPlaylist = useCallback(async (song: Song) => {
    if (!selectedPlaylist) return;
    try {
      await musicService.addSongToPlaylist(selectedPlaylist.id, song.id, playlistSongs.length);
      setPlaylistSongs(prev => [...prev, song]);
      setShowAddSong(false);
    } catch {
      Alert.alert('Erreur', "Impossible d'ajouter le titre.");
    }
  }, [selectedPlaylist, playlistSongs]);

  const handleRemoveSong = useCallback(async (songId: string) => {
    if (!selectedPlaylist) return;
    try {
      await musicService.removeSongFromPlaylist(selectedPlaylist.id, songId);
      setPlaylistSongs(prev => prev.filter(s => s.id !== songId));
    } catch {
      Alert.alert('Erreur', "Impossible de retirer le titre.");
    }
  }, [selectedPlaylist]);

  const handleSharePlaylist = useCallback(async (pl: Playlist, songs: Song[]) => {
    const songList = songs.map(s => `${s.title} - ${s.artist?.name ?? ''}`).join('\n');
    const message = `🎵 Découvre ma playlist Kabod Music : "${pl.name}"\n\n${songList}\n\nPartagé via Kabod Music 📱`;
    try {
      await Share.share({ title: pl.name, message });
    } catch {
      // User cancelled
    }
  }, []);

  const handleShareCurrentPlaylist = useCallback(async () => {
    if (!selectedPlaylist) return;
    await handleSharePlaylist(selectedPlaylist, playlistSongs);
  }, [selectedPlaylist, playlistSongs, handleSharePlaylist]);

  const allSongs = catalogService.getSongsSync();
  const addedIds = new Set(playlistSongs.map(s => s.id));

  if (selectedPlaylist) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedPlaylist(null)}>
            <XIcon size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{selectedPlaylist.name}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShareCurrentPlaylist}>
              <ShareIcon2 size={20} color={SPOTIFY_GREEN} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddSong(true)}>
              <PlusIcon size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.songList}>
          <TouchableOpacity
            style={styles.playAllBtn}
            onPress={() => playlistSongs.length > 0 && onPlaySong(playlistSongs[0], playlistSongs)}
          >
            <PlayIcon size={18} color="#fff" />
            <Text style={styles.playAllText}>Tout écouter ({playlistSongs.length})</Text>
          </TouchableOpacity>

          {playlistSongs.map((song, idx) => {
            const globalIdx = allSongs.findIndex(s => s.id === song.id);
            const isCur = currentSong?.id === song.id;
            return (
              <TouchableOpacity
                key={song.id}
                style={[styles.songRow, isCur && styles.songRowActive]}
                onPress={() => onPlaySong(song, playlistSongs)}
              >
                <Image source={catalogService.getCoverForIndex(globalIdx >= 0 ? globalIdx : 0)} style={styles.songCover} />
                <View style={styles.songInfo}>
                  <Text style={[styles.songTitle, isCur && styles.songTitleActive, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
                  <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>{song.artist?.name ?? ''}</Text>
                </View>
                <TouchableOpacity style={styles.songActionBtn} onPress={() => onToggleFavorite(song.id)}>
                  <HeartIcon size={16} color={isFavorite(song.id) ? SPOTIFY_GREEN : 'rgba(255,255,255,0.4)'} fill={isFavorite(song.id)} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveSong(song.id)} hitSlop={8}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
          {playlistSongs.length === 0 && (
            <Text style={styles.emptyText}>Appuie sur + pour ajouter des titres</Text>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        <Modal visible={showAddSong} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Ajouter un titre</Text>
                <TouchableOpacity onPress={() => setShowAddSong(false)}><XIcon size={22} color={colors.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.addSongList}>
                {allSongs.filter(s => !addedIds.has(s.id)).map((song, idx) => {
                  const globalIdx = allSongs.findIndex(s => s.id === song.id);
                  return (
                    <TouchableOpacity key={song.id} style={styles.addSongRow} onPress={() => handleAddSongToPlaylist(song)}>
                      <Image source={catalogService.getCoverForIndex(globalIdx >= 0 ? globalIdx : 0)} style={styles.songCover} />
                      <View style={styles.songInfo}>
                        <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
                        <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>{song.artist?.name ?? ''}</Text>
                      </View>
                      <PlusIcon size={18} color={SPOTIFY_GREEN} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('library')}>
          <XIcon size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes playlists</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)}>
          <PlusIcon size={22} color={SPOTIFY_GREEN} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={SPOTIFY_GREEN} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {playlists.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune playlist</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Crée ta première playlist avec +</Text>
            </View>
          ) : (
            playlists.map(pl => (
              <TouchableOpacity key={pl.id} style={styles.plRow} onPress={() => handleSelectPlaylist(pl)}>
                <View style={styles.plCover}>
                  <Text style={styles.plIcon}>🎵</Text>
                </View>
                <View style={styles.plInfo}>
                  <Text style={[styles.plName, { color: colors.text }]} numberOfLines={1}>{pl.name}</Text>
                  <Text style={[styles.plMeta, { color: colors.textSecondary }]}>{pl.is_private ? 'Privée' : 'Publique'}</Text>
                </View>
                <TouchableOpacity style={styles.plShareBtn} onPress={async () => {
                  const songs = await musicService.getPlaylistSongs(pl.id);
                  handleSharePlaylist(pl, songs);
                }}>
                  <ShareIcon2 size={18} color={SPOTIFY_GREEN} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <Modal visible={showCreate} animationType="fade" transparent>
        <TouchableOpacity style={styles.createOverlay} activeOpacity={1} onPress={() => setShowCreate(false)}>
          <View style={styles.createSheet}>
            <Text style={styles.createTitle}>Nouvelle playlist</Text>
            <TextInput
              style={styles.createInput}
              placeholder="Nom de la playlist"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.createActions}>
              <TouchableOpacity style={styles.createCancel} onPress={() => setShowCreate(false)}>
                <Text style={styles.createCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, !newName.trim() && styles.createBtnDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>Créer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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

const ARTIST_COLORS = ['#1DB954', '#E91E63', '#FF9800', '#2196F3', '#9C27B0', '#00BCD4'];

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  list: { paddingHorizontal: 24, gap: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  plRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  plCover: { width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  plIcon: { fontSize: 22 },
  plInfo: { flex: 1 },
  plName: { fontSize: 15, fontWeight: '600' },
  plMeta: { fontSize: 12, marginTop: 2 },
  plShareBtn: { padding: 8 },
  createOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  createSheet: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24, width: '80%', maxWidth: 340 },
  createTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16, textAlign: 'center' },
  createInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, fontSize: 15, color: '#fff', marginBottom: 20 },
  createActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  createCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  createCancelText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  createBtn: { backgroundColor: SPOTIFY_GREEN, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, minWidth: 80, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  songList: { paddingHorizontal: 24, paddingTop: 16, gap: 4 },
  playAllBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: SPOTIFY_GREEN, borderRadius: 24, paddingVertical: 10, paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  playAllText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, gap: 12 },
  songRowActive: { backgroundColor: 'rgba(29, 185, 84, 0.1)' },
  songCover: { width: 44, height: 44, borderRadius: 8 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 14, fontWeight: '600' },
  songTitleActive: { color: SPOTIFY_GREEN },
  songArtist: { fontSize: 12, marginTop: 2 },
  songActionBtn: { padding: 4 },
  removeBtn: { fontSize: 16, color: 'rgba(255,255,255,0.4)', padding: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  addSongList: { paddingHorizontal: 24, gap: 4 },
  addSongRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  miniPlayer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingBottom: 24, backgroundColor: 'rgba(10,10,18,0.95)' },
  miniInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 30, 50, 0.92)', borderRadius: 16, padding: 10, gap: 10 },
  miniCover: { width: 42, height: 42, borderRadius: 8 },
  miniInfo: { flex: 1 },
  miniTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  miniArtist: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  miniPlayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: SPOTIFY_GREEN, alignItems: 'center', justifyContent: 'center' },
  miniPlayText: { fontSize: 16, color: '#fff' },
});
