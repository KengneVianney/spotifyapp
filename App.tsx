import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { authService } from './src/services/authService';
import { catalogService } from './src/services/catalogService';
import { favoritesService } from './src/services/favoritesService';
import type { Song } from './src/types';

import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import NowPlayingScreen from './src/screens/NowPlayingScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import GlobalAudioPlayer from './src/components/GlobalAudioPlayer';
import { clearCache } from './src/services/audioCacheService';

type AuthScreen = 'loading' | 'login' | 'signup' | 'app';
type AppScreen = 'discover' | 'nowplaying' | 'search' | 'library';

export default function App() {
  const [authScreen, setAuthScreen] = useState<AuthScreen>('loading');
  const [appScreen, setAppScreen] = useState<AppScreen>('discover');
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [cacheRatio, setCacheRatio] = useState(0);
  const [cached, setCached] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);

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

  const startSong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setPlaybackProgress(0);
    setPositionSec(0);
    setDurationSec(song.duration_seconds ?? 0);
    setAudioError(null);
  };

  const setPlaybackFromDiscover = (song: Song, songs: Song[]) => {
    setQueue(songs);
    startSong(song);
    setAppScreen('nowplaying');
  };

  const handleAudioProgress = (currentTime: number, total: number) => {
    setPositionSec(currentTime);
    if (total > 0) {
      setDurationSec(total);
      setPlaybackProgress(
        Math.max(0, Math.min(100, (currentTime / total) * 100)),
      );
    }
  };

  const togglePlay = () => {
    if (!currentSong) return;
    setIsPlaying(prev => !prev);
  };

  const goToAdjacentSong = (direction: -1 | 1) => {
    if (!currentSong || queue.length === 0) return;
    const index = queue.findIndex(song => song.id === currentSong.id);
    if (index < 0) return;
    const nextIndex = (index + direction + queue.length) % queue.length;
    startSong(queue[nextIndex]);
  };

  const goToNextSong = useCallback(() => goToAdjacentSong(1), [queue, currentSong]);
  const goToPreviousSong = useCallback(() => goToAdjacentSong(-1), [queue, currentSong]);

  const nextSong = (() => {
    if (!currentSong || queue.length === 0) return null;
    const index = queue.findIndex(song => song.id === currentSong.id);
    if (index < 0) return null;
    return queue[(index + 1) % queue.length] ?? null;
  })();

  const handleCacheStatus = ({
    ratio,
    cached: isDone,
  }: {
    ratio: number;
    cached: boolean;
  }) => {
    setCacheRatio(ratio);
    setCached(isDone);
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch {
      // Déconnexion locale même si le réseau échoue
    }
    clearCache().catch(() => {});
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
    };
  }, []);

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <GlobalAudioPlayer
          currentSong={currentSong}
          nextSong={nextSong}
          isPlaying={isPlaying}
          onProgress={handleAudioProgress}
          onTrackEnded={goToNextSong}
          onError={setAudioError}
          onCacheStatus={handleCacheStatus}
        />
        {appScreen === 'discover' && <DiscoverScreen {...screenProps} />}
        {appScreen === 'nowplaying' && (
          <NowPlayingScreen
            {...screenProps}
            onNext={goToNextSong}
            onPrevious={goToPreviousSong}
            position={positionSec}
            duration={durationSec}
            audioError={audioError}
            cacheRatio={cacheRatio}
            cached={cached}
          />
        )}
        {appScreen === 'search' && <SearchScreen {...screenProps} />}
        {appScreen === 'library' && <LibraryScreen {...screenProps} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A12',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
});