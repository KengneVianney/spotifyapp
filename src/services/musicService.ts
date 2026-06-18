import { supabase } from './supabaseClient';
import type { Song, Album, Artist, Playlist, Lyrics } from '../types';

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
      const { data, error } = await supabase.from('artists').select('*').order('name', { ascending: true });
      if (error) throw error;
      return (data as Artist[]) ?? [];
    }, []);
  },

  async getPlaylists(): Promise<Playlist[]> {
    return safeQuery(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .or(`user_id.eq.${user.id},is_private.eq.false`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Playlist[]) ?? [];
    }, []);
  },

  async createPlaylist(name: string, isPrivate = false): Promise<Playlist> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté.');

    const { data, error } = await supabase
      .from('playlists')
      .insert({ name, is_private: isPrivate, user_id: user.id })
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
        const { error } = await supabase.from('favorite_songs').insert({ user_id: user.id, song_id: songId });
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

  async getLyrics(songId: string): Promise<Lyrics | null> {
    return safeQuery(async () => {
      const { data, error } = await supabase
        .from('lyrics')
        .select('*')
        .eq('song_id', songId)
        .maybeSingle();

      if (error) throw error;
      return data as Lyrics | null;
    }, null);
  },

  async getTopCharts(limit = 50): Promise<Song[]> {
    return safeQuery(async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*, artist:artists(*), album:albums(*)')
        .order('play_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as Song[]) ?? [];
    }, []);
  },

  async getUserProfile(): Promise<{ email: string; id: string } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      return { email: user.email ?? 'unknown@email.com', id: user.id };
    } catch {
      return null;
    }
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
