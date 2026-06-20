import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { Playlist } from '../types';

interface JoinPlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (inviteCode: string) => Promise<Playlist | null>;
}

const SPOTIFY_GREEN = '#1DB954';

export default function JoinPlaylistModal({
  visible,
  onClose,
  onConfirm,
}: JoinPlaylistModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setCode('');
      setError(null);
      setSuccess(null);
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (!code.trim()) {
      setError('Entre un code d\'invitation.');
      return;
    }
    if (code.trim().length !== 6) {
      setError('Le code doit contenir 6 caractères.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await onConfirm(code.trim().toUpperCase());
    setLoading(false);
    if (result) {
      setSuccess(`Tu as rejoint "${result.name}" !`);
      setTimeout(() => onClose(), 1500);
    } else {
      setError('Code invalide ou playlist introuvable.');
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
          <Text style={styles.title}>Rejoindre une playlist</Text>
          <Text style={styles.subtitle}>
            Entre le code d'invitation partagé par ton ami
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ex: AB12CD"
            placeholderTextColor="#555"
            value={code}
            onChangeText={text => {
              setCode(text.toUpperCase());
              if (error) setError(null);
              if (success) setSuccess(null);
            }}
            autoCapitalize="characters"
            maxLength={6}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>⚠ {error}</Text> : null}
          {success ? <Text style={styles.successText}>✓ {success}</Text> : null}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onClose}
              disabled={loading}>
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnJoin, loading && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnJoinText}>Rejoindre</Text>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#0F0F18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    color: SPOTIFY_GREEN,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
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
  btnJoin: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SPOTIFY_GREEN,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnJoinText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});