export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

export interface Genre {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Artist {
  id: string;
  name: string;
  bio?: string;
  image_url?: string;
  created_at: string;
}

export interface Album {
  id: string;
  title: string;
  release_date?: string;
  cover_image_url?: string;
  artist_id: string;
  like_count: number;
  created_at: string;
  artist?: Artist; // Optionnel : jointure
}

export interface Song {
  id: string;
  title: string;
  duration_seconds: number;
  audio_url: string;
  album_id?: string;
  artist_id: string;
  genre_id?: string;
  play_count: number;
  like_count: number;
  created_at: string;
  artist?: Artist; // Optionnel : jointure
  album?: Album;   // Optionnel : jointure
}

export interface Playlist {
  id: string;
  name: string;
  is_private: boolean;
  is_collaborative: boolean;
  invite_code: string | null;
  collaborators: string[];
  user_id: string;
  created_at: string;
  songs?: Song[];
}

export interface PlaylistSong {
  playlist_id: string;
  song_id: string;
  position: number;
}

export interface FavoriteSong {
  user_id: string;
  song_id: string;
  created_at: string;
}

export interface PlayHistory {
  id: string;
  user_id: string;
  song_id: string;
  listened_at: string;
  duration_played_seconds: number;
}
