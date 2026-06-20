import { useState, useEffect, useCallback } from 'react';
import { musicService } from '../services/musicService';
import { catalogService } from '../services/catalogService';
import type { Playlist, Song } from '../types';
import { supabase } from '../services/supabaseClient';

interface UseUserPlaylists {
  playlists: Playlist[];
  loading: boolean;
  error: string | null;
  createPlaylist: (name: string, isPrivate?: boolean, isCollaborative?: boolean) => Promise<Playlist | null>;
  deletePlaylist: (id: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  getPlaylistSongs: (playlistId: string) => Promise<Song[]>;
  joinPlaylist: (inviteCode: string) => Promise<Playlist | null>;
  refetch: () => Promise<void>;
}

export function useUserPlaylists(): UseUserPlaylists {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylists = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await musicService.getPlaylists();
      setPlaylists(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const createPlaylist = async (
    name: string,
    isPrivate: boolean = false,
    isCollaborative: boolean = false,
  ): Promise<Playlist | null> => {
    try {
      const playlist = await musicService.createPlaylist(name, isPrivate, isCollaborative);
      setPlaylists(prev => [playlist, ...prev]);
      return playlist;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur création playlist';
      setError(message);
      return null;
    }
  };

  const deletePlaylist = async (id: string): Promise<void> => {
    try {
      const { error: err } = await supabase
        .from('playlists')
        .delete()
        .eq('id', id);
      if (err) throw err;
      setPlaylists(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur suppression';
      setError(message);
    }
  };

  const removeSongFromPlaylist = async (
    playlistId: string,
    songId: string,
  ): Promise<void> => {
    try {
      await musicService.removeSongFromPlaylist(playlistId, songId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur retrait titre';
      setError(message);
    }
  };

  const getPlaylistSongs = async (playlistId: string): Promise<Song[]> => {
    try {
      const remoteSongs = await musicService.getPlaylistSongs(playlistId);
      return remoteSongs.map(remoteSong => {
        const localSong = catalogService.getSongById(remoteSong.id);
        return localSong ?? remoteSong;
      });
    } catch {
      return [];
    }
  };

  const joinPlaylist = async (inviteCode: string): Promise<Playlist | null> => {
    try {
      const playlist = await musicService.joinCollaborativePlaylist(inviteCode);
      setPlaylists(prev => {
        const exists = prev.find(p => p.id === playlist.id);
        if (exists) return prev;
        return [playlist, ...prev];
      });
      return playlist;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Code invalide.';
      setError(message);
      return null;
    }
  };

  return {
    playlists,
    loading,
    error,
    createPlaylist,
    deletePlaylist,
    removeSongFromPlaylist,
    getPlaylistSongs,
    joinPlaylist,
    refetch: fetchPlaylists,
  };
}