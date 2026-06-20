import { supabase } from './supabaseClient';
import type { Song, Album, Artist, Playlist } from '../types';

function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return /network request failed|failed to fetch|network error|timeout/i.test(message);
}

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (!isNetworkError(error)) {
      console.warn('Supabase:', error);
    }
    return fallback;
  }
}

// Génère un code d'invitation de 6 caractères
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const musicService = {
  async getSongs(limit = 20): Promise<Song[]> {
    return safeQuery(async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*, artist:artists(*), album:albums(*)')
        .limit(limit)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Song[]) ?? [];
    }, []);
  },

  async searchSongs(query: string): Promise<Song[]> {
    if (!query.trim()) return [];
    return safeQuery(async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*, artist:artists(*), album:albums(*)')
        .ilike('title', `%${query}%`)
        .limit(30);
      if (error) throw error;
      return (data as Song[]) ?? [];
    }, []);
  },

  async getAlbums(artistId?: string): Promise<Album[]> {
    return safeQuery(async () => {
      let queryBuilder = supabase.from('albums').select('*, artist:artists(*)');
      if (artistId) {
        queryBuilder = queryBuilder.eq('artist_id', artistId);
      }
      const { data, error } = await queryBuilder.order('release_date', { ascending: false });
      if (error) throw error;
      return (data as Album[]) ?? [];
    }, []);
  },

  async getArtists(): Promise<Artist[]> {
    return safeQuery(async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data as Artist[]) ?? [];
    }, []);
  },

  async getPlaylists(): Promise<Playlist[]> {
    return safeQuery(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Récupère les playlists de l'utilisateur + les collaboratives où il est collaborateur
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .or(`user_id.eq.${user.id},collaborators.cs.{${user.id}}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Playlist[]) ?? [];
    }, []);
  },

  async createPlaylist(
    name: string,
    isPrivate = false,
    isCollaborative = false,
  ): Promise<Playlist> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté.');

    const invite_code = isCollaborative ? generateInviteCode() : null;

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        name,
        is_private: isPrivate,
        is_collaborative: isCollaborative,
        invite_code,
        collaborators: [],
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Playlist;
  },

  // Rejoindre une playlist collaborative via son code
  async joinCollaborativePlaylist(inviteCode: string): Promise<Playlist> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté.');

    // Trouve la playlist avec ce code
    const { data: playlist, error: findError } = await supabase
      .from('playlists')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (findError || !playlist) throw new Error('Code invalide ou playlist introuvable.');

    // Vérifie que l'utilisateur n'est pas déjà collaborateur
    const collaborators: string[] = playlist.collaborators ?? [];
    if (collaborators.includes(user.id) || playlist.user_id === user.id) {
      return playlist as Playlist;
    }

    // Ajoute l'utilisateur aux collaborateurs
    const { data, error } = await supabase
      .from('playlists')
      .update({ collaborators: [...collaborators, user.id] })
      .eq('id', playlist.id)
      .select()
      .single();

    if (error) throw error;
    return data as Playlist;
  },

  async addSongToPlaylist(playlistId: string, songId: string, position = 0): Promise<void> {
    const { error } = await supabase.from('playlist_songs').insert({
      playlist_id: playlistId,
      song_id: songId,
      position,
    });
    if (error) throw error;
  },

  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
    const { error } = await supabase
      .from('playlist_songs')
      .delete()
      .match({ playlist_id: playlistId, song_id: songId });
    if (error) throw error;
  },

  async getPlaylistSongs(playlistId: string): Promise<Song[]> {
    return safeQuery(async () => {
      const { data, error } = await supabase
        .from('playlist_songs')
        .select('song_id, song:songs(*, artist:artists(*), album:albums(*))')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data.map(item => item.song) as unknown as Song[];
    }, []);
  },

  async toggleFavoriteSong(songId: string, shouldLike: boolean): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (shouldLike) {
        const { error } = await supabase
          .from('favorite_songs')
          .insert({ user_id: user.id, song_id: songId });
        if (error && !isNetworkError(error)) throw error;
      } else {
        const { error } = await supabase
          .from('favorite_songs')
          .delete()
          .match({ user_id: user.id, song_id: songId });
        if (error && !isNetworkError(error)) throw error;
      }
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  },

  async getFavoriteSongs(): Promise<Song[]> {
    return safeQuery(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('favorite_songs')
        .select('song:songs(*, artist:artists(*), album:albums(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(item => item.song) as unknown as Song[];
    }, []);
  },

  async logPlayHistory(songId: string, durationPlayedSeconds: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('play_history').insert({
        user_id: user.id,
        song_id: songId,
        duration_played_seconds: durationPlayedSeconds,
      });
      if (error && !isNetworkError(error)) {
        console.warn("Historique d'écoute:", error.message);
      }
    } catch (error) {
      if (!isNetworkError(error)) {
        console.warn("Historique d'écoute:", error);
      }
    }
  },
};