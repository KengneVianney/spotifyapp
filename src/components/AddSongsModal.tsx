import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { catalogService } from '../services/catalogService';
import { musicService } from '../services/musicService';
import type { Song } from '../types';

interface AddSongsModalProps {
  visible: boolean;
  playlistId: string;
  onClose: () => void;
  onSongsAdded: () => void; // appelé après ajout pour rafraîchir la liste
}

const SPOTIFY_GREEN = '#1DB954';

export default function AddSongsModal({
  visible,
  playlistId,
  onClose,
  onSongsAdded,
}: AddSongsModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Réinitialise à chaque ouverture
  React.useEffect(() => {
    if (visible) {
      setSearch('');
      setSelectedIds([]);
    }
  }, [visible]);

  // Filtre les titres selon la recherche
  const filteredSongs = useMemo(() => {
    const all = catalogService.getSongsSync();
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        (s.artist?.name ?? '').toLowerCase().includes(q),
    );
  }, [search]);

  const toggleSong = (songId: string) => {
    setSelectedIds(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId],
    );
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      // Ajoute chaque titre sélectionné à la playlist
      await Promise.all(
        selectedIds.map((songId, index) =>
          musicService.addSongToPlaylist(playlistId, songId, index),
        ),
      );
      onSongsAdded(); // rafraîchit la liste dans LibraryScreen
      onClose();
    } catch (err) {
      console.warn('Erreur ajout titres:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderSong = ({ item, index }: { item: Song; index: number }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.songRow, isSelected && styles.songRowSelected]}
        onPress={() => toggleSong(item.id)}
        activeOpacity={0.7}>
        {/* Indicateur de sélection */}
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.artist?.name ?? 'Artiste inconnu'}
          </Text>
        </View>
        <Text style={styles.songDuration}>
          {Math.floor(item.duration_seconds / 60)}:
          {String(Math.floor(item.duration_seconds % 60)).padStart(2, '0')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Ajouter des titres</Text>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={loading || selectedIds.length === 0}>
              {loading ? (
                <ActivityIndicator color={SPOTIFY_GREEN} size="small" />
              ) : (
                <Text style={[
                  styles.confirmText,
                  selectedIds.length === 0 && styles.confirmDisabled,
                ]}>
                  Ajouter ({selectedIds.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un titre..."
            placeholderTextColor="#555"
            value={search}
            onChangeText={setSearch}
          />

          {/* Liste des titres */}
          <FlatList
            data={filteredSongs}
            keyExtractor={item => item.id}
            renderItem={renderSong}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end', // monte depuis le bas comme Spotify
  },
  card: {
    backgroundColor: '#13131A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    height: '85%',
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelText: {
    color: '#aaa',
    fontSize: 15,
  },
  confirmText: {
    color: SPOTIFY_GREEN,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmDisabled: {
    opacity: 0.4,
  },
  searchInput: {
    backgroundColor: '#0F0F18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
    margin: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
  songRowSelected: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: SPOTIFY_GREEN,
    borderColor: SPOTIFY_GREEN,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  songArtist: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  songDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
});