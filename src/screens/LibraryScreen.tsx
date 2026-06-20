import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Clipboard,
} from 'react-native';
import { PlayIcon } from '../components/Icons';
import BottomTabBar from '../components/BottomTabBar';
import MiniPlayer from '../components/MiniPlayer';
import { catalogService } from '../services/catalogService';
import { useUserPlaylists } from '../hooks/useUserPlaylists';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import JoinPlaylistModal from '../components/JoinPlaylistModal';
import AddSongsModal from '../components/AddSongsModal';
import LocalScanScreen from './LocalScanScreen';
import type { Song, Artist, Album, Playlist } from '../types';
import type { CuratedPlaylist } from '../data/localMusicData';

const SPOTIFY_GREEN = '#1DB954';

type AppScreen = 'discover' | 'nowplaying' | 'search' | 'library';

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
}: ScreenProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('playlists');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<CuratedPlaylist | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedUserPlaylist, setSelectedUserPlaylist] = useState<Playlist | null>(null);
  const [userPlaylistSongs, setUserPlaylistSongs] = useState<Song[]>([]);
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [showLocalScan, setShowLocalScan] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const {
    playlists: userPlaylists,
    createPlaylist,
    getPlaylistSongs,
    deletePlaylist,
    removeSongFromPlaylist,
    joinPlaylist,
  } = useUserPlaylists();

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
  }, [selectedPlaylist, favoriteIds]);

  const handleCopyCode = (code: string) => {
    Clipboard.setString(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const renderSongList = (list: Song[]) =>
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
            <Text style={[styles.songTitle, isCurrentSong && styles.songTitleActive]} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
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
  ) => (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle} numberOfLines={1}>
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
            <Text style={styles.bannerTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.bannerSubtitle}>{subtitle}</Text>
            <Text style={styles.bannerMeta}>
              {songsList.length} titre{songsList.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.playAllBtn}
          onPress={() => songsList.length > 0 && onPlaySong(songsList[0], songsList)}>
          <PlayIcon size={20} color="#fff" />
          <Text style={styles.playAllText}>Tout écouter</Text>
        </TouchableOpacity>

        <View style={styles.detailSongs}>
          {renderSongList(songsList)}
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

  if (showLocalScan) {
    return (
      <LocalScanScreen
        onBack={() => setShowLocalScan(false)}
        onPlaySong={onPlaySong}
        currentSong={currentSong}
      />
    );
  }

  if (selectedArtist) {
    const idx = artists.findIndex(a => a.id === selectedArtist.id);
    return renderDetailView(
      selectedArtist.name,
      selectedArtist.bio || 'Artiste',
      artistSongs,
      () => setSelectedArtist(null),
      undefined,
      ARTIST_COLORS[idx >= 0 ? idx % ARTIST_COLORS.length : 0],
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

  if (selectedUserPlaylist) {
    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedUserPlaylist(null)}>
            <Text style={styles.backBtnText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>
            {selectedUserPlaylist.name}
          </Text>
          <TouchableOpacity
            onPress={async () => {
              await deletePlaylist(selectedUserPlaylist.id);
              setSelectedUserPlaylist(null);
            }}>
            <Text style={styles.deletePlaylistText}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
          <View style={styles.bannerInfo}>
            <View style={[styles.bannerAvatar, { backgroundColor: SPOTIFY_GREEN }]}>
              <Text style={styles.bannerAvatarText}>
                {selectedUserPlaylist.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle} numberOfLines={2}>
                {selectedUserPlaylist.name}
              </Text>
              <Text style={styles.bannerSubtitle}>
                {selectedUserPlaylist.is_collaborative ? '👥 Collaborative' : selectedUserPlaylist.is_private ? '🔒 Privée' : '🌍 Publique'}
              </Text>
              <Text style={styles.bannerMeta}>
                {userPlaylistSongs.length} titre{userPlaylistSongs.length > 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Code d'invitation pour playlist collaborative */}
          {selectedUserPlaylist.is_collaborative && selectedUserPlaylist.invite_code ? (
            <TouchableOpacity
              style={styles.inviteCodeWrap}
              onPress={() => handleCopyCode(selectedUserPlaylist.invite_code ?? '')}>
              <Text style={styles.inviteCodeLabel}>Code d'invitation</Text>
              <Text style={styles.inviteCode}>{selectedUserPlaylist.invite_code}</Text>
              <Text style={styles.inviteCodeCopy}>
                {codeCopied ? '✓ Copié !' : 'Appuie pour copier'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.playAllBtn}
            onPress={() =>
              userPlaylistSongs.length > 0 &&
              onPlaySong(userPlaylistSongs[0], userPlaylistSongs)
            }>
            <PlayIcon size={20} color="#fff" />
            <Text style={styles.playAllText}>Tout écouter</Text>
          </TouchableOpacity>

          <View style={styles.detailSongs}>
            {userPlaylistSongs.map((song, idx) => {
              const isCurrentSong = currentSong?.id === song.id;
              return (
                <View key={song.id} style={styles.songRowWrap}>
                  <TouchableOpacity
                    style={[styles.songRow, isCurrentSong && styles.songRowActive, { flex: 1 }]}
                    onPress={() => onPlaySong(song, userPlaylistSongs)}
                    activeOpacity={0.7}>
                    <Image
                      source={catalogService.getCoverForIndex(idx)}
                      style={styles.songCover}
                    />
                    <View style={styles.songInfo}>
                      <Text
                        style={[styles.songTitle, isCurrentSong && styles.songTitleActive]}
                        numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={styles.songArtist} numberOfLines={1}>
                        {song.artist?.name ?? 'Artiste inconnu'}
                      </Text>
                    </View>
                    <Text style={styles.songDuration}>
                      {Math.floor(song.duration_seconds / 60)}:
                      {String(Math.floor(song.duration_seconds % 60)).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={async () => {
                      await removeSongFromPlaylist(selectedUserPlaylist.id, song.id);
                      const updated = await getPlaylistSongs(selectedUserPlaylist.id);
                      setUserPlaylistSongs(updated);
                    }}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {userPlaylistSongs.length === 0 ? (
              <Text style={styles.emptyText}>
                Aucun titre. Appuie sur "+ Ajouter des titres".
              </Text>
            ) : null}
          </View>

          <View style={{ height: 160 }} />
        </ScrollView>

        <TouchableOpacity
          style={styles.addSongsBtn}
          onPress={() => setShowAddSongsModal(true)}>
          <Text style={styles.addSongsBtnText}>+ Ajouter des titres</Text>
        </TouchableOpacity>

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

        <AddSongsModal
          visible={showAddSongsModal}
          playlistId={selectedUserPlaylist.id}
          onClose={() => setShowAddSongsModal(false)}
          onSongsAdded={async () => {
            const updated = await getPlaylistSongs(selectedUserPlaylist.id);
            setUserPlaylistSongs(updated);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ma Bibliothèque</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowJoinModal(true)}>
              <Text style={styles.localScanText}>🔗 Rejoindre</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLocalScan(true)}>
              <Text style={styles.localScanText}>📁 Local</Text>
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
          {activeTab === 'playlists' && (
            <View>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setShowCreateModal(true)}>
                <Text style={styles.createBtnText}>+ Nouvelle playlist</Text>
              </TouchableOpacity>

              {userPlaylists.map(pl => (
                <TouchableOpacity
                  key={pl.id}
                  style={[styles.libRow, { marginBottom: 16 }]}
                  onPress={async () => {
                    const fetchedSongs = await getPlaylistSongs(pl.id);
                    setUserPlaylistSongs(fetchedSongs);
                    setSelectedUserPlaylist(pl);
                  }}>
                  <View style={styles.plCoverWrap}>
                    <Text style={styles.plIcon}>
                      {pl.is_collaborative ? '👥' : '🎵'}
                    </Text>
                  </View>
                  <View style={styles.libRowInfo}>
                    <Text style={styles.rowTitle}>{pl.name}</Text>
                    <Text style={styles.rowSubtitle}>
                      {pl.is_collaborative
                        ? '👥 Collaborative'
                        : pl.is_private
                        ? '🔒 Privée'
                        : '🌍 Publique'} · Ma playlist
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {userPlaylists.length > 0 && (
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionDividerText}>Playlists recommandées</Text>
                </View>
              )}

              {playlists.map(pl => {
                const count =
                  pl.id === 'pl-favorites'
                    ? favoriteIds.length
                    : catalogService.getPlaylistSongs(pl.id).length;
                return (
                  <TouchableOpacity
                    key={pl.id}
                    style={[styles.libRow, { marginBottom: 16 }]}
                    onPress={() => setSelectedPlaylist(pl)}>
                    <View style={[styles.plCoverWrap, pl.isLikes && styles.plLikesCover]}>
                      <Text style={styles.plIcon}>{pl.isLikes ? '❤️' : '🎶'}</Text>
                    </View>
                    <View style={styles.libRowInfo}>
                      <Text style={styles.rowTitle}>{pl.title}</Text>
                      <Text style={styles.rowSubtitle}>
                        Playlist · {pl.creator} · {count} titres
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

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
                      <Text style={styles.rowTitle}>{artist.name}</Text>
                      <Text style={styles.rowSubtitle}>
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
                    <Text style={styles.rowTitle}>{album.title}</Text>
                    <Text style={styles.rowSubtitle}>
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

      <CreatePlaylistModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={createPlaylist}
      />

      <JoinPlaylistModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onConfirm={joinPlaylist}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A12' },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#fff' },
  logoutText: { fontSize: 13, color: SPOTIFY_GREEN, fontWeight: '600' },
  localScanText: { fontSize: 13, color: SPOTIFY_GREEN, fontWeight: '600' },
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
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  rowSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  detailContainer: { flex: 1, backgroundColor: '#0A0A12' },
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
  detailHeaderTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
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
  bannerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  bannerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6 },
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
    marginBottom: 24,
  },
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
  songTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  songTitleActive: { color: SPOTIFY_GREEN },
  songArtist: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  songDuration: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  addSongsBtn: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: SPOTIFY_GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addSongsBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  createBtn: {
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SPOTIFY_GREEN,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  createBtnText: { color: SPOTIFY_GREEN, fontWeight: '700', fontSize: 15 },
  sectionDivider: {
    marginVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 16,
  },
  sectionDividerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  songRowWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  removeBtnText: { color: '#F87171', fontSize: 16, fontWeight: '700' },
  deletePlaylistText: { fontSize: 20, paddingLeft: 12 },
  inviteCodeWrap: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
    alignItems: 'center',
  },
  inviteCodeLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  inviteCode: {
    color: SPOTIFY_GREEN,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 6,
  },
  inviteCodeCopy: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 4,
  },
});