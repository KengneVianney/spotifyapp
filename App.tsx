import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { authService } from './src/services/authService';
import { catalogService } from './src/services/catalogService';
import { favoritesService } from './src/services/favoritesService';
import { musicService } from './src/services/musicService';
import { isOnline } from './src/services/networkService';
import type { Song } from './src/types';
import OfflineScreen from './src/screens/OfflineScreen';

import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import NowPlayingScreen from './src/screens/NowPlayingScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import CollaborativePlaylistScreen from './src/screens/CollaborativePlaylistScreen';
import ShareScreen from './src/screens/ShareScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PlaylistManageScreen from './src/screens/PlaylistManageScreen';
import TopChartsScreen from './src/screens/TopChartsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

type AuthScreen = 'loading' | 'login' | 'signup' | 'app';
type AppScreen = 'discover' | 'nowplaying' | 'search' | 'library' | 'collaborative' | 'share' | 'history' | 'playlistmanage' | 'topcharts' | 'profile';

type RadioFilter = { type: 'artist' | 'album'; id: string } | null;

function AppInner() {
  const { colors } = useTheme();

  const [authScreen, setAuthScreen] = useState<AuthScreen>('loading');
  const [appScreen, setAppScreen] = useState<AppScreen>('discover');
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [radioMode, setRadioMode] = useState(false);
  const [radioFilter, setRadioFilter] = useState<RadioFilter>(null);

  const refreshFavorites = useCallback(async () => {
    const ids = await favoritesService.getFavoriteIds();
    setFavoriteIds(ids);
  }, []);

  const toggleFavorite = useCallback(
    async (songId: string) => {
      await favoritesService.toggleFavorite(songId);
      await refreshFavorites();
    },
    [refreshFavorites],
  );

  const isFavorite = useCallback(
    (songId: string) => favoriteIds.includes(songId),
    [favoriteIds],
  );

  const setPlaybackFromDiscover = (song: Song, songs: Song[]) => {
    setQueue(songs);
    setCurrentSong(song);
    setIsPlaying(true);
    setPlaybackProgress(0);
    setAppScreen('nowplaying');
  };

  const togglePlay = () => {
    if (!currentSong) return;
    setIsPlaying(prev => !prev);
  };

  const goToNextSongCore = (direction: -1 | 1) => {
    if (!currentSong || queue.length === 0) return;
    const index = queue.findIndex(song => song.id === currentSong.id);
    if (index < 0) return;
    const nextIndex = (index + direction + queue.length) % queue.length;
    setCurrentSong(queue[nextIndex]);
    setIsPlaying(true);
    setPlaybackProgress(0);
  };

  const goToNextSong = useCallback(() => {
    if (!currentSong || queue.length === 0) return;
    const index = queue.findIndex(song => song.id === currentSong.id);
    if (index < 0) return;

    // Radio mode with filter: ajouter un titre filtré quand on arrive au dernier
    if (radioMode && index === queue.length - 1) {
      const allSongs = catalogService.getSongsSync();
      const usedIds = new Set(queue.map(s => s.id));
      let available = allSongs.filter(s => !usedIds.has(s.id));

      if (radioFilter) {
        if (radioFilter.type === 'artist') {
          available = available.filter(s => s.artist_id === radioFilter.id);
        } else if (radioFilter.type === 'album') {
          available = available.filter(s => s.album_id === radioFilter.id);
        }
      }

      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        const newQueue = [...queue, pick];
        setQueue(newQueue);
        setCurrentSong(pick);
        setIsPlaying(true);
        setPlaybackProgress(0);
        return;
      }
    }

    goToNextSongCore(1);
  }, [currentSong, queue, radioMode, radioFilter, setQueue]);

  const goToPreviousSong = () => goToNextSongCore(-1);

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch {}
    setAuthScreen('login');
    setCatalogReady(false);
    setCurrentSong(null);
    setIsPlaying(false);
  };

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      try {
        const profile = await authService.getCurrentProfile();
        if (!mounted) return;
        setAuthScreen(profile ? 'app' : 'login');
      } catch {
        if (mounted) setAuthScreen('login');
      }
    };

    bootstrapAuth();

    const handleDeepLink = async (event: { url: string }) => {
      const ok = await authService.handleOAuthCallback(event.url);
      if (ok && mounted) {
        setAuthScreen('app');
      }
    };

    const linkingSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });

    const subscription = authService.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session) {
        setAuthScreen('app');
      } else if (event === 'SIGNED_OUT') {
        setAuthScreen('login');
        setCatalogReady(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  const checkConnectivity = useCallback(async () => {
    const result = await isOnline();
    setOnline(result);
    return result;
  }, []);

  useEffect(() => {
    if (authScreen !== 'app') return;
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30000);
    return () => clearInterval(interval);
  }, [authScreen, checkConnectivity]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    await checkConnectivity();
    setRetrying(false);
  }, [checkConnectivity]);

  useEffect(() => {
    if (authScreen !== 'app') return;

    let cancelled = false;
    (async () => {
      try {
        await catalogService.loadCatalog();
        await refreshFavorites();
      } finally {
        if (!cancelled) setCatalogReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authScreen, refreshFavorites]);

  if (authScreen === 'loading' || (authScreen === 'app' && !catalogReady)) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (authScreen === 'app' && !online) {
    return <OfflineScreen onRetry={handleRetry} retrying={retrying} />;
  }

  if (authScreen === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={() => setAuthScreen('app')}
        onNavigateToSignUp={() => setAuthScreen('signup')}
      />
    );
  }

  if (authScreen === 'signup') {
    return (
      <SignUpScreen
        onSignUpSuccess={() => setAuthScreen('login')}
        onNavigateToLogin={() => setAuthScreen('login')}
      />
    );
  }

  const screenProps = {
    onNavigate: setAppScreen,
    currentSong,
    isPlaying,
    onPlaySong: setPlaybackFromDiscover,
    onTogglePlay: togglePlay,
    playbackProgress,
    favoriteIds,
    isFavorite,
    onToggleFavorite: toggleFavorite,
    onLogout: handleLogout,
  };

  const radioProps = { setRadioMode, setRadioFilter };

  const nowPlayingExtra = {
    onNext: goToNextSong,
    onPrevious: goToPreviousSong,
    onTrackEnded: goToNextSong,
    onProgressUpdate: setPlaybackProgress,
    queue,
    setQueue,
    setCurrentSong,
    radioMode,
    setRadioMode,
    radioFilter,
    setRadioFilter,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {appScreen === 'discover' && <DiscoverScreen {...screenProps} {...radioProps} />}
      {appScreen === 'nowplaying' && (
        <NowPlayingScreen {...screenProps} {...nowPlayingExtra} />
      )}
      {appScreen === 'search' && <SearchScreen {...screenProps} />}
      {appScreen === 'library' && <LibraryScreen {...screenProps} {...radioProps} />}
      {appScreen === 'collaborative' && <CollaborativePlaylistScreen {...screenProps} />}
      {appScreen === 'share' && <ShareScreen {...screenProps} />}
      {appScreen === 'history' && <HistoryScreen {...screenProps} />}
      {appScreen === 'playlistmanage' && <PlaylistManageScreen {...screenProps} />}
      {appScreen === 'topcharts' && <TopChartsScreen {...screenProps} />}
      {appScreen === 'profile' && <ProfileScreen {...screenProps} />}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
