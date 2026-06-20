import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { Playlist } from '../types';

interface CreatePlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, isPrivate: boolean, isCollaborative: boolean) => Promise<Playlist | null>;
}

const SPOTIFY_GREEN = '#1DB954';

export default function CreatePlaylistModal({
  visible,
  onClose,
  onConfirm,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setName('');
      setIsPrivate(false);
      setIsCollaborative(false);
      setError(null);
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (!name.trim()) {
      setError('Le nom de la playlist est obligatoire.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await onConfirm(name.trim(), isPrivate, isCollaborative);
    setLoading(false);
    if (result) {
      onClose();
    } else {
      setError('Erreur lors de la création. Réessaie.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          <Text style={styles.title}>Nouvelle playlist</Text>

          {/* Champ nom */}
          <TextInput
            style={styles.input}
            placeholder="Nom de la playlist"
            placeholderTextColor="#555"
            value={name}
            onChangeText={text => {
              setName(text);
              if (error) setError(null);
            }}
            autoFocus
            maxLength={50}
          />

          {/* Toggle privée */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Playlist privée</Text>
              <Text style={styles.toggleDesc}>Visible uniquement par toi</Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: '#333', true: SPOTIFY_GREEN }}
              thumbColor="#fff"
            />
          </View>

          {/* Toggle collaborative */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Playlist collaborative</Text>
              <Text style={styles.toggleDesc}>Tes amis peuvent ajouter des titres</Text>
            </View>
            <Switch
              value={isCollaborative}
              onValueChange={setIsCollaborative}
              trackColor={{ false: '#333', true: SPOTIFY_GREEN }}
              thumbColor="#fff"
            />
          </View>

          {/* Info code si collaborative */}
          {isCollaborative && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                🔗 Un code d'invitation sera généré automatiquement que tu pourras partager avec tes amis.
              </Text>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onClose}
              disabled={loading}>
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnCreate, loading && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnCreateText}>Créer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#13131A',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#0F0F18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleDesc: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
  },
  infoText: {
    color: SPOTIFY_GREEN,
    fontSize: 13,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1E1E2E',
    alignItems: 'center',
  },
  btnCancelText: {
    color: '#aaa',
    fontWeight: '600',
    fontSize: 15,
  },
  btnCreate: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SPOTIFY_GREEN,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnCreateText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});