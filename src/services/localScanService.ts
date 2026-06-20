/**
 * localScanService.ts
 * Scanne le stockage du téléphone pour trouver les fichiers audio
 * et les retourne sous forme de Song[] compatibles avec l'app.
 */
import { readDir, ExternalStorageDirectoryPath } from '@dr.pogodin/react-native-fs';
import { PermissionsAndroid, Platform } from 'react-native';
import type { Song } from '../types';

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac'];

function isAudioFile(name: string): boolean {
  const lower = name.toLowerCase();
  return AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function fileNameToTitle(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
}

async function requestPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  // Android 13+ utilise READ_MEDIA_AUDIO
  if (Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      {
        title: 'Accès aux fichiers audio',
        message: 'L\'app a besoin d\'accéder à vos fichiers audio.',
        buttonPositive: 'Autoriser',
        buttonNegative: 'Refuser',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  // Android < 13 utilise READ_EXTERNAL_STORAGE
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    {
      title: 'Accès au stockage',
      message: 'L\'app a besoin d\'accéder à vos fichiers audio.',
      buttonPositive: 'Autoriser',
      buttonNegative: 'Refuser',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

async function scanDirectory(dirPath: string): Promise<Song[]> {
  const songs: Song[] = [];
  try {
    const entries = await readDir(dirPath);
    for (const entry of entries) {
      if (entry.isFile() && isAudioFile(entry.name)) {
        songs.push({
          id: `local-${entry.path}`,
          title: fileNameToTitle(entry.name),
          audio_url: `file://${entry.path}`,
          duration_seconds: 0,
          artist_id: 'local',
          play_count: 0,
          like_count: 0,
          created_at: new Date().toISOString(),
          artist: { id: 'local', name: 'Local', created_at: '' },
        });
      } else if (entry.isDirectory()) {
        // Scan récursif dans les sous-dossiers
        const subSongs = await scanDirectory(entry.path);
        songs.push(...subSongs);
      }
    }
  } catch {
    // Dossier inaccessible — on ignore
  }
  return songs;
}

export const localScanService = {
  async scanLocalAudio(): Promise<Song[]> {
    const hasPermission = await requestPermission();
    if (!hasPermission) return [];

    const songs = await scanDirectory(ExternalStorageDirectoryPath);
    return songs;
  },
};