import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, TextInput, Modal, Alert,
} from 'react-native';
import BottomTabBar from '../components/BottomTabBar';
import MiniPlayer from '../components/MiniPlayer';
import { catalogService } from '../services/catalogService';
import { collaborativePlaylistService } from '../services/collaborativePlaylistService';
import type { Song, CollaborativePlaylist } from '../types';

const SPOTIFY_GREEN = '#1DB954';

type AppScreen = 'discover' | 'nowplaying' | 'search' | 'library';

type ScreenProps = {
  onNavigate: (screen: AppScreen) => void;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onTogglePlay: () => void;
  playbackProgress: number;
  favoriteIds: string[];
  isFavorite: (songId: string) => boolean;
  onToggleFavorite: (songId: string) => void;
  onLogout: () => void;
};

export default function CollaborativePlaylistScreen({
  onNavigate, currentSong, isPlaying, onPlaySong,
  onTogglePlay, playbackProgress,
  isFavorite,
  onToggleFavorite,
}: ScreenProps) {
  const [playlists, setPlaylists] = useState<CollaborativePlaylist[]>([]);
  const [selectedPl, setSelectedPl] = useState<CollaborativePlaylist | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddContributor, setShowAddContributor] = useState(false);
  const [showAddSong, setShowAddSong] = useState(false);
  const [plName, setPlName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [contribName, setContribName] = useState('');

  const songs = catalogService.getSongsSync();

  useEffect(() => {
    collaborativePlaylistService.getAll().then(setPlaylists);
  }, []);

  const refresh = async () => {
    const all = await collaborativePlaylistService.getAll();
    setPlaylists(all);
    if (selectedPl) {
      const updated = all.find(p => p.id === selectedPl.id);
      setSelectedPl(updated ?? null);
    }
  };

  const handleCreate = async () => {
    if (!plName.trim() || !creatorName.trim()) return;
    await collaborativePlaylistService.create(plName.trim(), creatorName.trim());
    setPlName('');
    setCreatorName('');
    setShowCreate(false);
    await refresh();
  };

  const handleAddContributor = async () => {
    if (!selectedPl || !contribName.trim()) return;
    const ok = await collaborativePlaylistService.addContributor(selectedPl.id, contribName.trim());
    if (!ok) {
      Alert.alert('Limite atteinte', 'Maximum 8 contributeurs ou nom déjà pris.');
      return;
    }
    setContribName('');
    setShowAddContributor(false);
    await refresh();
  };

  const handleAddSong = async (songId: string) => {
    if (!selectedPl) return;
    const contribId = selectedPl.contributors[0]?.id;
    if (!contribId) return;
    await collaborativePlaylistService.addSong(selectedPl.id, songId, contribId);
    await refresh();
  };

  const plSongs = useMemo(() => {
    if (!selectedPl) return [];
    return selectedPl.songIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => Boolean(s));
  }, [selectedPl, songs]);

  if (selectedPl) {
    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedPl(null)}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle} numberOfLines={1}>{selectedPl.name}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.detailScroll}>
          <View style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Text style={styles.bannerIconText}>👥</Text>
            </View>
            <View style={styles.bannerInfo}>
              <Text style={styles.bannerTitle}>{selectedPl.name}</Text>
              <Text style={styles.bannerSub}>
                Créée par {selectedPl.creatorName} · {selectedPl.songIds.length} titres
              </Text>
              <Text style={styles.bannerContrib}>
                {selectedPl.contributors.length}/8 contributeurs
              </Text>
            </View>
          </View>

          <View style={styles.contribSection}>
            <Text style={styles.sectionTitle}>Contributeurs</Text>
            <View style={styles.contribChips}>
              {selectedPl.contributors.map(c => (
                <View key={c.id} style={styles.contribChip}>
                  <Text style={styles.contribChipText}>{c.name}</Text>
                  <Text style={styles.contribChipCount}>{c.addedSongIds.length} titres</Text>
                </View>
              ))}
              {selectedPl.contributors.length < 8 && (
                <TouchableOpacity
                  style={styles.addContribBtn}
                  onPress={() => setShowAddContributor(true)}>
                  <Text style={styles.addContribBtnText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.songsSection}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Titres ({plSongs.length})</Text>
              <TouchableOpacity onPress={() => setShowAddSong(true)}>
                <Text style={styles.addSongBtn}>+ Ajouter</Text>
              </TouchableOpacity>
            </View>
            {plSongs.length === 0 ? (
              <Text style={styles.emptyText}>Ajoutez des musiques depuis le catalogue.</Text>
            ) : (
              plSongs.map((song, idx) => {
                const globalIdx = songs.findIndex(s => s.id === song.id);
                return (
                  <TouchableOpacity
                    key={song.id}
                    style={styles.songRow}
                    onPress={() => onPlaySong(song, plSongs)}>
                    <Image
                      source={catalogService.getCoverForIndex(globalIdx >= 0 ? globalIdx : idx)}
                      style={styles.songCover}
                    />
                    <View style={styles.songInfo}>
                      <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                      <Text style={styles.songArtist} numberOfLines={1}>
                        {song.artist?.name ?? 'Artiste inconnu'}
                      </Text>
                    </View>
                    <Text style={styles.songDuration}>
                      {Math.floor(song.duration_seconds / 60)}:{String(Math.floor(song.duration_seconds % 60)).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
          <View style={{ height: 160 }} />
        </ScrollView>

        <Modal visible={showAddContributor} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Ajouter un contributeur</Text>
              <Text style={styles.modalHint}>
                {selectedPl.contributors.length}/8 — maximum atteint
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nom du contributeur"
                placeholderTextColor="#666"
                value={contribName}
                onChangeText={setContribName}
                autoCapitalize="none"
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddContributor(false)}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={handleAddContributor}>
                  <Text style={styles.modalConfirmText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showAddSong} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: 400 }]}>
              <Text style={styles.modalTitle}>Ajouter une musique</Text>
              <ScrollView>
                {songs.map(song => (
                  <TouchableOpacity
                    key={song.id}
                    style={styles.modalSongRow}
                    onPress={() => { handleAddSong(song.id); setShowAddSong(false); }}>
                    <Text style={styles.modalSongTitle} numberOfLines={1}>{song.title}</Text>
                    <Text style={styles.modalSongArtist} numberOfLines={1}>
                      {song.artist?.name ?? ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddSong(false)}>
                <Text style={[styles.modalCancelText, { textAlign: 'center' }]}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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

        <BottomTabBar active="library" onNavigate={onNavigate} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('library')}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Playlists collaboratives</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        <TouchableOpacity style={styles.createCard} onPress={() => setShowCreate(true)}>
          <Text style={styles.createIcon}>+</Text>
          <Text style={styles.createText}>Nouvelle playlist collaborative</Text>
          <Text style={styles.createHint}>Jusqu'à 8 personnes</Text>
        </TouchableOpacity>

        {playlists.length === 0 ? (
          <Text style={styles.emptyState}>
            Créez une playlist collaborative pour ajouter des musiques à plusieurs !
          </Text>
        ) : (
          playlists.map(pl => (
            <TouchableOpacity
              key={pl.id}
              style={styles.plCard}
              onPress={() => setSelectedPl(pl)}>
              <View style={styles.plIcon}>
                <Text style={styles.plIconText}>👥</Text>
              </View>
              <View style={styles.plInfo}>
                <Text style={styles.plName}>{pl.name}</Text>
                <Text style={styles.plMeta}>
                  {pl.creatorName} · {pl.contributors.length}/8 · {pl.songIds.length} titres
                </Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  await collaborativePlaylistService.delete(pl.id);
                  await refresh();
                }}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 140 }} />
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouvelle playlist collaborative</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nom de la playlist"
              placeholderTextColor="#666"
              value={plName}
              onChangeText={setPlName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Ton nom (contributeur)"
              placeholderTextColor="#666"
              value={creatorName}
              onChangeText={setCreatorName}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCreate(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCreate}>
                <Text style={styles.modalConfirmText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

      <BottomTabBar active="library" onNavigate={onNavigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A12' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  backText: { color: SPOTIFY_GREEN, fontSize: 15, fontWeight: '600' },
  listContent: { padding: 20, gap: 12 },
  createCard: {
    backgroundColor: 'rgba(29,185,84,0.08)', borderRadius: 16, borderWidth: 1,
    borderColor: SPOTIFY_GREEN, borderStyle: 'dashed', padding: 24,
    alignItems: 'center',
  },
  createIcon: { fontSize: 36, color: SPOTIFY_GREEN, fontWeight: '300' },
  createText: { fontSize: 16, fontWeight: '600', color: '#fff', marginTop: 8 },
  createHint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  emptyState: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
  plCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A',
    borderRadius: 14, padding: 16, gap: 14, borderWidth: 1, borderColor: '#1E1E2E',
  },
  plIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(29,185,84,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  plIconText: { fontSize: 22 },
  plInfo: { flex: 1 },
  plName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  plMeta: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  deleteBtn: { fontSize: 16, color: '#EF4444', padding: 8 },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  detailScroll: { flex: 1, paddingHorizontal: 20 },
  banner: { flexDirection: 'row', gap: 16, marginTop: 20, marginBottom: 24 },
  bannerIcon: {
    width: 80, height: 80, borderRadius: 16, backgroundColor: 'rgba(29,185,84,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerIconText: { fontSize: 36 },
  bannerInfo: { flex: 1, justifyContent: 'center' },
  bannerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  bannerContrib: { fontSize: 12, color: SPOTIFY_GREEN, fontWeight: '600', marginTop: 6 },
  contribSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 12 },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  contribChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  contribChip: {
    backgroundColor: 'rgba(29,185,84,0.12)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(29,185,84,0.25)',
  },
  contribChipText: { fontSize: 13, fontWeight: '600', color: SPOTIFY_GREEN },
  contribChipCount: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  addContribBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addContribBtnText: { fontSize: 20, color: 'rgba(255,255,255,0.4)' },
  songsSection: { marginBottom: 24 },
  addSongBtn: { fontSize: 13, color: SPOTIFY_GREEN, fontWeight: '600' },
  emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 20 },
  songRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12,
  },
  songCover: { width: 44, height: 44, borderRadius: 8 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  songArtist: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  songDuration: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 32,
  },
  modalCard: {
    backgroundColor: '#13131A', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#1E1E2E',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  modalHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#0F0F18', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A3E',
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#fff', marginTop: 12,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 14 },
  modalConfirm: {
    backgroundColor: SPOTIFY_GREEN, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20,
  },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalSongRow: {
    flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalSongTitle: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },
  modalSongArtist: { fontSize: 12, color: 'rgba(255,255,255,0.5)', maxWidth: 120 },
});
