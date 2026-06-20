import { supabase } from './supabaseClient';
import { authorize } from 'react-native-app-auth';
import type { Profile } from '../types';
import type { User } from '@supabase/supabase-js';


const GOOGLE_CONFIG = {
  issuer: 'https://accounts.google.com',
  clientId: '802747246222-9v4sjtrdh38p28cq5dnjgjcq5vuve53v.apps.googleusercontent.com',
  redirectUrl: 'com.spotifyrn:/oauth2redirect/google',
  scopes: ['openid', 'profile', 'email'],
};


const GITHUB_CONFIG = {
  issuer: 'https://github.com',
  clientId: 'Ov23liVBRdgFzM2ap4qz',
  clientSecret: '77af2c0db01fca8aee57f9d283acd692a4a4c7dd',
  redirectUrl: 'com.spotifyrn:/oauth2redirect/github',
  scopes: ['read:user', 'user:email'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    revocationEndpoint:
      'https://github.com/settings/connections/applications/TON_GITHUB_CLIENT_ID',
  },
};

function profileFromUser(user: User): Profile {
  const username =
    (user.user_metadata?.username as string | undefined) ||
    user.email?.split('@')[0] ||
    'Utilisateur';

  return {
    id: user.id,
    username,
    avatar_url: user.user_metadata?.avatar_url as string | undefined,
    created_at: user.created_at ?? new Date().toISOString(),
  };
}

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

export const authService = {
  async signUp(email: string, password: string, username: string, avatarUrl?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          avatar_url: avatarUrl || '',
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Connexion Google via react-native-app-auth + Supabase
  async signInWithGoogle(): Promise<void> {
    try {
      const result = await authorize(GOOGLE_CONFIG);
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: result.idToken ?? '',
        access_token: result.accessToken, // <-- corrigé
      });
      if (error) throw error;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  },

  // Connexion GitHub via react-native-app-auth + Supabase
  async signInWithGitHub(): Promise<void> {
    try {
      const result = await authorize(GITHUB_CONFIG);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          queryParams: { access_token: result.accessToken },
        },
      });
      if (error) throw error;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await supabase.auth.signOut({ scope: 'local' });
    }
  },

  async getCurrentProfile(): Promise<Profile | null> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        if (isNetworkError(sessionError)) return null;
        console.warn('Session auth:', sessionError.message);
        return null;
      }

      const user = session?.user;
      if (!user) return null;

      try {
        const { data: profile, error: dbError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!dbError && profile) return profile as Profile;

        if (dbError && !isNetworkError(dbError)) {
          console.warn('Profil Supabase:', dbError.message);
        }
      } catch (error) {
        if (!isNetworkError(error)) {
          console.warn('Profil Supabase:', error);
        }
      }

      return profileFromUser(user);
    } catch (error) {
      if (!isNetworkError(error)) {
        console.warn('Auth:', error);
      }
      return null;
    }
  },

  async hasLocalSession(): Promise<boolean> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return Boolean(session?.user);
    } catch {
      return false;
    }
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  },
};