import { useState, useCallback } from 'react';
import { localScanService } from '../services/localScanService';
import type { Song } from '../types';

interface UseLocalScan {
  localSongs: Song[];
  scanning: boolean;
  error: string | null;
  scan: () => Promise<void>;
}

export function useLocalScan(): UseLocalScan {
  const [localSongs, setLocalSongs] = useState<Song[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (): Promise<void> => {
    setScanning(true);
    setError(null);
    try {
      const songs = await localScanService.scanLocalAudio();
      setLocalSongs(songs);
      if (songs.length === 0) {
        setError('Aucun fichier audio trouvé sur le téléphone.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du scan.';
      setError(message);
    } finally {
      setScanning(false);
    }
  }, []);

  return { localSongs, scanning, error, scan };
}