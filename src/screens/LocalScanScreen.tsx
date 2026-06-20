import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useLocalScan } from '../hooks/useLocalScan';
import type { Song } from '../types';

const SPOTIFY_GREEN = '#1DB954';

interface LocalScanScreenProps {
  onBack: () => void;
  onPlaySong: (song: Song, queue: Song[]) => void;
  currentSong: Song | null;
}

export default function LocalScanScreen({
  onBack,
  onPlaySong,
  currentSong,
}: LocalScanScreenProps) {
  const { localSongs, scanning, error, scan } = useLocalScan();

  // Lance le scan automatiquement à l'ouverture
  useEffect(() => {
    scan();
  }, [scan]);

  const renderSong = ({ item }: { item: Song }) => {
    const isCurrentSong = currentSong?.id === item.id;
    const minutes = Math.floor(item.duration_seconds / 60);
    const seconds = String(Math.floor(item.duration_seconds % 60)).padStart(2, '0');

    return (
      <TouchableOpacity
        style={[styles.songRow, isCurrentSong && styles.songRowActive]}
        onPress={() => onPlaySong(item, localSongs)}
        activeOpacity={0.7}>
        <View style={styles.songIcon}>
          <Text style={styles.songIconText}>🎵</Text>
        </View>
        <View style={styles.songInfo}>
          <Text
            style={[styles.songTitle, isCurrentSong && styles.songTitleActive]}
            numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            Fichier local
          </Text>
        </View>
        {item.duration_seconds > 0 ? (
          <Text style={styles.songDuration}>
            {minutes}:{seconds}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Musiques locales</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={scan} disabled={scanning}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      {scanning ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={SPOTIFY_GREEN} />
          <Text style={styles.scanningText}>Scan en cours...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={scan}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={localSongs}
          keyExtractor={item => item.id}
          renderItem={renderSong}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Text style={styles.countText}>
              {localSongs.length} fichier{localSongs.length > 1 ? 's' : ''} trouvé{localSongs.length > 1 ? 's' : ''}
            </Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A12' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { paddingRight: 16 },
  backBtnText: { color: SPOTIFY_GREEN, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  refreshBtn: { padding: 8 },
  refreshBtnText: { color: SPOTIFY_GREEN, fontSize: 22 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  scanningText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, marginTop: 12 },
  errorText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    backgroundColor: SPOTIFY_GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  countText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginVertical: 16,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 12,
    marginBottom: 4,
  },
  songRowActive: { backgroundColor: 'rgba(29, 185, 84, 0.1)' },
  songIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  songIconText: { fontSize: 20 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  songTitleActive: { color: SPOTIFY_GREEN },
  songArtist: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  songDuration: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});