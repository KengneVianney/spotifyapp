import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  StatusBar, ScrollView, TextInput, Modal, Alert, Platform,
} from 'react-native';
import { PlayIcon } from '../components/Icons';
import BottomTabBar from '../components/BottomTabBar';
import MiniPlayer from '../components/MiniPlayer';
import { catalogService } from '../services/catalogService';
import { shareService } from '../services/shareService';
import type { Song, SharedMusicPackage } from '../types';

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
};

export default function ShareScreen({
  onNavigate, currentSong, isPlaying, onPlaySong,
  onTogglePlay, playbackProgress,
  isFavorite,
  onToggleFavorite,
}: ScreenProps) {
  const [tab, setTab] = useState<'send' | 'inbox'>('send');
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [senderName, setSenderName] = useState('Moi');
  const [inbox, setInbox] = useState<SharedMusicPackage[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');

  const songs = catalogService.getSongsSync();

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = async () => {
    const items = await shareService.getInbox();
    setInbox(items);
  };

  const toggleSelect = (songId: string) => {
    setSelectedSongs(prev => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  };

  const selectedSongsList = useMemo(
    () => songs.filter(s => selectedSongs.has(s.id)),
    [selectedSongs, songs],
  );

  const handleSend = async () => {
    if (selectedSongs.size === 0) {
      Alert.alert('Sélection', 'Choisis au moins une musique à partager.');
      return;
    }
    await shareService.sendSongs(selectedSongsList, senderName);
    Alert.alert('Partagé !', 'Les musiques ont été partagées via le système local.');
  };

  const handleImport = async () => {
    const pkg = await shareService.receivePackage(importJson);
    if (pkg) {
      Alert.alert('Reçu !', `${pkg.songIds.length} musique(s) importée(s) de ${pkg.senderName}.`);
      setImportJson('');
      setShowImport(false);
      await loadInbox();
    } else {
      Alert.alert('Erreur', 'Format invalide. Colle un package de partage Kabod Music.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Partage</Text>
      </View>

      <View style={styles.tabs}>
        {(['send', 'inbox'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'send' ? 'Envoyer' : 'Reçus'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tab === 'send' && (
          <>
            <View style={styles.sendBanner}>
              <Text style={styles.sendBannerTitle}>Partager des musiques</Text>
              <Text style={styles.sendBannerSub}>
                Sélectionne des musiques à partager via Bluetooth, WiFi ou messagerie.
              </Text>
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.nameLabel}>Ton nom :</Text>
              <TextInput
                style={styles.nameInput}
                value={senderName}
                onChangeText={setSenderName}
                placeholder="Moi"
                placeholderTextColor="#666"
              />
            </View>

            {selectedSongs.size > 0 && (
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                <Text style={styles.sendBtnText}>
                  Partager {selectedSongs.size} titre{selectedSongs.size > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.listTitle}>
              Catalogue ({songs.length} titres)
            </Text>

            {songs.map((song, idx) => {
              const isSelected = selectedSongs.has(song.id);
              const globalIdx = songs.findIndex(s => s.id === song.id);
              return (
                <TouchableOpacity
                  key={song.id}
                  style={[styles.songRow, isSelected && styles.songRowSelected]}
                  onPress={() => toggleSelect(song.id)}>
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
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {tab === 'inbox' && (
          <>
            <View style={styles.inboxHeader}>
              <Text style={styles.listTitle}>
                Musiques reçues ({inbox.length} paquet{inbox.length > 1 ? 's' : ''})
              </Text>
              <TouchableOpacity onPress={() => setShowImport(true)}>
                <Text style={styles.importBtn}>+ Importer</Text>
              </TouchableOpacity>
            </View>

            {inbox.length === 0 ? (
              <View style={styles.emptyInbox}>
                <Text style={styles.emptyIcon}>📥</Text>
                <Text style={styles.emptyText}>
                  Aucune musique reçue. Demande à un ami de partager des musiques avec toi !
                </Text>
              </View>
            ) : (
              inbox.map(pkg => {
                const pkgSongs = shareService.getSongsFromPackage(pkg);
                return (
                  <View key={pkg.id} style={styles.pkgCard}>
                    <View style={styles.pkgHeader}>
                      <Text style={styles.pkgSender}>De : {pkg.senderName}</Text>
                      <Text style={styles.pkgDate}>
                        {new Date(pkg.sentAt).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                    <Text style={styles.pkgCount}>
                      {pkg.songIds.length} titre{pkg.songIds.length > 1 ? 's' : ''}
                    </Text>
                    {pkgSongs.map(song => (
                      <TouchableOpacity
                        key={song.id}
                        style={styles.pkgSong}
                        onPress={() => onPlaySong(song, pkgSongs)}>
                        <PlayIcon size={14} color={SPOTIFY_GREEN} />
                        <Text style={styles.pkgSongTitle} numberOfLines={1}>{song.title}</Text>
                        <Text style={styles.pkgSongArtist} numberOfLines={1}>
                          {song.artist?.name ?? ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.pkgDelete}
                      onPress={async () => {
                        await shareService.removeFromInbox(pkg.id);
                        await loadInbox();
                      }}>
                      <Text style={styles.pkgDeleteText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      <Modal visible={showImport} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Importer des musiques</Text>
            <Text style={styles.modalHint}>
              Colle le JSON de partage reçu par message/bluetooth/WiFi.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder='{"id":"share_...","senderName":"...","songIds":[...]}'
              placeholderTextColor="#555"
              value={importJson}
              onChangeText={setImportJson}
              multiline
              numberOfLines={5}
              autoCapitalize="none"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowImport(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleImport}>
                <Text style={styles.modalConfirmText}>Importer</Text>
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
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#fff' },
  tabs: {
    flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: { backgroundColor: SPOTIFY_GREEN },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: '#fff' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },
  sendBanner: {
    backgroundColor: 'rgba(29,185,84,0.08)', borderRadius: 16,
    padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(29,185,84,0.2)',
  },
  sendBannerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  sendBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 18 },
  nameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  nameLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },
  nameInput: {
    flex: 1, backgroundColor: '#0F0F18', borderRadius: 10, borderWidth: 1,
    borderColor: '#2A2A3E', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#fff',
  },
  sendBtn: {
    backgroundColor: SPOTIFY_GREEN, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 20,
  },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 12 },
  songRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12,
    borderRadius: 10, paddingHorizontal: 6,
  },
  songRowSelected: { backgroundColor: 'rgba(29,185,84,0.08)' },
  songCover: { width: 44, height: 44, borderRadius: 8 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  songArtist: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { borderColor: SPOTIFY_GREEN, backgroundColor: SPOTIFY_GREEN },
  checkMark: { fontSize: 13, color: '#fff', fontWeight: '700' },
  inboxHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  importBtn: { fontSize: 13, color: SPOTIFY_GREEN, fontWeight: '600' },
  emptyInbox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 14, lineHeight: 20 },
  pkgCard: {
    backgroundColor: '#13131A', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#1E1E2E',
  },
  pkgHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pkgSender: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pkgDate: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  pkgCount: { fontSize: 12, color: SPOTIFY_GREEN, fontWeight: '600', marginBottom: 12 },
  pkgSong: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6,
  },
  pkgSongTitle: { fontSize: 13, fontWeight: '600', color: '#fff', flex: 1 },
  pkgSongArtist: { fontSize: 11, color: 'rgba(255,255,255,0.5)', maxWidth: 100 },
  pkgDelete: { marginTop: 8, alignSelf: 'flex-end' },
  pkgDeleteText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 32,
  },
  modalCard: {
    backgroundColor: '#13131A', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#1E1E2E',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  modalHint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 17 },
  modalInput: {
    backgroundColor: '#0F0F18', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A3E',
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#fff', textAlignVertical: 'top',
    minHeight: 100, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 14 },
  modalConfirm: { backgroundColor: SPOTIFY_GREEN, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
