import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { PlayIcon, RadioIcon, TrendingIcon } from '../components/Icons';
import BottomTabBar from '../components/BottomTabBar';
import MiniPlayer from '../components/MiniPlayer';
import { catalogService } from '../services/catalogService';
import { useTheme } from '../context/ThemeContext';
import type { Song, Artist, Album } from '../types';
import type { CuratedPlaylist } from '../data/localMusicData';

const SPOTIFY_GREEN = '#1DB954';

type AppScreen = 'discover' | 'nowplaying' | 'search' | 'library' | 'collaborative' | 'share' | 'history' | 'playlistmanage' | 'topcharts' | 'profile';

type ScreenProps = {
  onNavigate: (screen: AppScreen) => void;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onTogglePlay: () => void;
  playbackProgress: number;
  favoriteIds: string[];
  isFavorite: (songId: string) => boolean;
  onToggleFavorite: (songId: string) => void;
  onLogout: () => void;
  setRadioMode?: (v: boolean) => void;
  setRadioFilter?: (f: { type: 'artist' | 'album'; id: string } | null) => void;
};

type ActiveTab = 'playlists' | 'artists' | 'albums';

const ARTIST_COLORS = ['#1DB954', '#E91E63', '#FF9800', '#2196F3', '#9C27B0', '#00BCD4'];

export default function LibraryScreen({
  onNavigate,
  currentSong,
  isPlaying,
  onPlaySong,
  onTogglePlay,
  playbackProgress,
  favoriteIds,
  isFavorite,
  onToggleFavorite,
  onLogout,
  setRadioMode,
  setRadioFilter,
}: ScreenProps) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>('playlists');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<CuratedPlaylist | null>(null);

  const songs = catalogService.getSongsSync();
  const artists = catalogService.getArtists();
  const albums = catalogService.getAlbums();
  const playlists = catalogService.getPlaylists();

  const artistSongs = useMemo(
    () => (selectedArtist ? catalogService.getSongsByArtist(selectedArtist.id) : []),
    [selectedArtist],
  );

  const albumSongs = useMemo(
    () => (selectedAlbum ? songs.filter(s => s.album_id === selectedAlbum.id) : []),
    [selectedAlbum, songs],
  );

  const playlistSongs = useMemo(() => {
    if (!selectedPlaylist) return [];
    return catalogService.getPlaylistSongs(selectedPlaylist.id, favoriteIds);
  }, [selectedPlaylist, favoriteIds, songs]);

  const startRadio = useCallback((filter: { type: 'artist' | 'album'; id: string }, songsList: Song[]) => {
    setRadioFilter?.(filter);
    setRadioMode?.(true);
    if (songsList.length > 0) {
      onPlaySong(songsList[0], songsList);
    }
  }, [setRadioFilter, setRadioMode, onPlaySong]);

  const renderSongList = (list: Song[], radioFilterType?: 'artist' | 'album', filterId?: string) =>
    list.map((song, idx) => {
      const globalIndex = songs.findIndex(s => s.id === song.id);
      const isCurrentSong = currentSong?.id === song.id;
      return (
        <TouchableOpacity
          key={song.id}
          style={[styles.songRow, isCurrentSong && styles.songRowActive]}
          onPress={() => onPlaySong(song, list)}
          activeOpacity={0.7}>
          <Image
            source={catalogService.getCoverForIndex(globalIndex >= 0 ? globalIndex : idx)}
            style={styles.songCover}
          />
          <View style={styles.songInfo}>
            <Text style={[styles.songTitle, isCurrentSong && styles.songTitleActive, { color: colors.text }]} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>
              {song.artist?.name ?? 'Artiste inconnu'}
            </Text>
          </View>
          <Text style={styles.songDuration}>
            {Math.floor(song.duration_seconds / 60)}:
            {String(Math.floor(song.duration_seconds % 60)).padStart(2, '0')}
          </Text>
        </TouchableOpacity>
      );
    });

  const renderDetailView = (
    title: string,
    subtitle: string,
    songsList: Song[],
    onBack: () => void,
    coverImage?: ReturnType<typeof catalogService.getCoverForIndex>,
    initialColor?: string,
    radioFilterType?: 'artist' | 'album',
    filterId?: string,
  ) => (
    <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.detailHeaderTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
        <View style={styles.bannerInfo}>
          {coverImage ? (
            <Image source={coverImage} style={styles.bannerCover} />
          ) : (
            <View style={[styles.bannerAvatar, { backgroundColor: initialColor || SPOTIFY_GREEN }]}>
              <Text style={styles.bannerAvatarText}>{title.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.bannerText}>
            <Text style={[styles.bannerTitle, { color: colors.text }]} numberOfLines={2}>
              {title}
            </Text>
            <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            <Text style={styles.bannerMeta}>
              {songsList.length} titre{songsList.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.playAllBtn}
            onPress={() => songsList.length > 0 && onPlaySong(songsList[0], songsList)}>
            <PlayIcon size={20} color="#fff" />
            <Text style={styles.playAllText}>Tout écouter</Text>
          </TouchableOpacity>
          {radioFilterType && filterId && (
            <TouchableOpacity
              style={styles.radioBtn}
              onPress={() => startRadio({ type: radioFilterType, id: filterId }, songsList)}>
              <RadioIcon size={18} color="#fff" />
              <Text style={styles.radioBtnText}>Lancer la radio</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.detailSongs}>
          {renderSongList(songsList, radioFilterType, filterId)}
          {songsList.length === 0 ? (
            <Text style={styles.emptyText}>
              {selectedPlaylist?.isLikes
                ? 'Aucun titre liké. Appuie sur ♥ pendant la lecture.'
                : 'Aucune musique dans cette playlist.'}
            </Text>
          ) : null}
        </View>
        <View style={{ height: 160 }} />
      </ScrollView>

      {currentSong ? (
        <MiniPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          isLiked={isFavorite(currentSong.id)}
          progressPercent={playbackProgress}
          onOpenNowPlaying={() => onNavigate('nowplaying')}
          onTogglePlay={onTogglePlay}
          onToggleLike={() => onToggleFavorite(currentSong.id)}
        />
      ) : null}
    </View>
  );

  if (selectedArtist) {
    const idx = artists.findIndex(a => a.id === selectedArtist.id);
    return renderDetailView(
      selectedArtist.name,
      selectedArtist.bio || 'Artiste',
      artistSongs,
      () => setSelectedArtist(null),
      undefined,
      ARTIST_COLORS[idx >= 0 ? idx % ARTIST_COLORS.length : 0],
      'artist',
      selectedArtist.id,
    );
  }

  if (selectedAlbum) {
    const idx = albums.findIndex(a => a.id === selectedAlbum.id);
    const artist = artists.find(a => a.id === selectedAlbum.artist_id);
    return renderDetailView(
      selectedAlbum.title,
      `Album · ${artist?.name ?? 'Artiste'}`,
      albumSongs,
      () => setSelectedAlbum(null),
      catalogService.getCoverForIndex(idx >= 0 ? idx + 1 : 0),
      undefined,
      'album',
      selectedAlbum.id,
    );
  }

  if (selectedPlaylist) {
    const cover = selectedPlaylist.isLikes
      ? catalogService.getCoverForIndex(0)
      : catalogService.getCoverForIndex(2);
    return renderDetailView(
      selectedPlaylist.title,
      `Créée par ${selectedPlaylist.creator}`,
      playlistSongs,
      () => setSelectedPlaylist(null),
      cover,
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Ma Bibliothèque</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => onNavigate('topcharts')} style={styles.headerActionBtn}>
              <TrendingIcon size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('profile')} style={styles.headerActionBtn}>
              <Text style={styles.headerActionText}>👤</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('history')} style={styles.headerActionBtn}>
              <Text style={styles.headerActionText}>🕐</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('playlistmanage')} style={styles.headerActionBtn}>
              <Text style={styles.headerActionText}>📋</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('share')} style={styles.headerActionBtn}>
              <Text style={styles.headerActionText}>📤</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('collaborative')} style={styles.headerActionBtn}>
              <Text style={styles.headerActionText}>👥</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout}>
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.categoryTabs}>
          {(['playlists', 'artists', 'albums'] as ActiveTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.catTab, activeTab === tab && styles.catTabActive]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.catTabText, activeTab === tab && styles.catTabTextActive]}>
                {tab === 'playlists' ? 'Playlists' : tab === 'artists' ? 'Artistes' : 'Albums'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'playlists' &&
            playlists.map(pl => {
              const count =
                pl.id === 'pl-favorites'
                  ? favoriteIds.length
                  : catalogService.getPlaylistSongs(pl.id).length;
              return (
                <TouchableOpacity
                  key={pl.id}
                  style={styles.libRow}
                  onPress={() => setSelectedPlaylist(pl)}>
                  <View style={[styles.plCoverWrap, pl.isLikes && styles.plLikesCover]}>
                    <Text style={styles.plIcon}>{pl.isLikes ? '❤️' : '🎶'}</Text>
                  </View>
                  <View style={styles.libRowInfo}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>{pl.title}</Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                      Playlist · {pl.creator} · {count} titres
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

          {activeTab === 'artists' &&
            artists
              .filter(a => songs.some(s => s.artist_id === a.id))
              .map((artist, idx) => {
                const count = songs.filter(s => s.artist_id === artist.id).length;
                return (
                  <TouchableOpacity
                    key={artist.id}
                    style={styles.libRow}
                    onPress={() => setSelectedArtist(artist)}>
                    <View
                      style={[
                        styles.artistAvatar,
                        { backgroundColor: ARTIST_COLORS[idx % ARTIST_COLORS.length] },
                      ]}>
                      <Text style={styles.artistLetter}>{artist.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.libRowInfo}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>{artist.name}</Text>
                      <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                        Artiste · {count} titre{count > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

          {activeTab === 'albums' &&
            albums.map((album, idx) => {
              const artist = artists.find(a => a.id === album.artist_id);
              const count = songs.filter(s => s.album_id === album.id).length;
              if (count === 0) return null;
              return (
                <TouchableOpacity
                  key={album.id}
                  style={styles.libRow}
                  onPress={() => setSelectedAlbum(album)}>
                  <Image source={catalogService.getCoverForIndex(idx + 1)} style={styles.albumCover} />
                  <View style={styles.libRowInfo}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>{album.title}</Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                      Album · {artist?.name} · {count} titres
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {currentSong ? (
        <MiniPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          isLiked={isFavorite(currentSong.id)}
          progressPercent={playbackProgress}
          onOpenNowPlaying={() => onNavigate('nowplaying')}
          onTogglePlay={onTogglePlay}
          onToggleLike={() => onToggleFavorite(currentSong.id)}
        />
      ) : null}

      <BottomTabBar active="library" onNavigate={onNavigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' },
  headerActionBtn: { padding: 4 },
  headerActionText: { fontSize: 18 },
  logoutText: { fontSize: 13, color: SPOTIFY_GREEN, fontWeight: '600' },
  categoryTabs: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 20 },
  catTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  catTabActive: { backgroundColor: SPOTIFY_GREEN },
  catTabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  catTabTextActive: { color: '#fff' },
  tabContent: { paddingHorizontal: 24, gap: 16 },
  libRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  plCoverWrap: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plLikesCover: { backgroundColor: 'rgba(29, 185, 84, 0.15)' },
  plIcon: { fontSize: 24 },
  artistAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistLetter: { fontSize: 22, fontWeight: '700', color: '#fff' },
  albumCover: { width: 60, height: 60, borderRadius: 8 },
  libRowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 12, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  detailContainer: { flex: 1 },
  detailHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { paddingRight: 16 },
  backBtnText: { color: SPOTIFY_GREEN, fontSize: 15, fontWeight: '600' },
  detailHeaderTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  detailScroll: { paddingHorizontal: 24, paddingTop: 24 },
  bannerInfo: { flexDirection: 'row', gap: 20, alignItems: 'center', marginBottom: 24 },
  bannerCover: { width: 110, height: 110, borderRadius: 14 },
  bannerAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerAvatarText: { fontSize: 48, fontWeight: '700', color: '#fff' },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 22, fontWeight: '700' },
  bannerSubtitle: { fontSize: 13, marginTop: 6 },
  bannerMeta: { fontSize: 12, color: SPOTIFY_GREEN, fontWeight: '600', marginTop: 8 },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: SPOTIFY_GREEN,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  radioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: SPOTIFY_GREEN,
  },
  radioBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  playAllText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  detailSongs: { gap: 4 },
  emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 32 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 12,
  },
  songRowActive: { backgroundColor: 'rgba(29, 185, 84, 0.1)' },
  songCover: { width: 48, height: 48, borderRadius: 8 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 14, fontWeight: '600' },
  songTitleActive: { color: SPOTIFY_GREEN },
  songArtist: { fontSize: 12, marginTop: 2 },
  songDuration: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});
