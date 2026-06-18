import { supabase } from './supabaseClient';
import type { Profile, SocialProvider } from '../types';
import type { User } from '@supabase/supabase-js';

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

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await supabase.auth.signOut({ scope: 'local' });
    }
  },

  /**
   * Session locale d'abord (pas d'appel réseau obligatoire).
   * Le profil Supabase est chargé si le réseau répond, sinon métadonnées de session.
   */
  async getCurrentProfile(): Promise<Profile | null> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

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

        if (!dbError && profile) {
          return profile as Profile;
        }

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
      const { data: { session } } = await supabase.auth.getSession();
      return Boolean(session?.user);
    } catch {
      return false;
    }
  },

  /**
   * OAuth 2.0 PKCE (Authorization Code + Proof Key for Code Exchange).
   * skipBrowserRedirect: true → mobile : on récupère l'URL, on l'ouvre dans le navigateur,
   * puis le callback deep link revient avec le code d'autorisation à échanger.
   */
  async signInWithProvider(provider: SocialProvider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'com.kabodmusic.app://auth/callback',
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;

    if (data.url) {
      const { Linking } = require('react-native');
      await Linking.openURL(data.url);
    }

    return data;
  },

  async signInWithGoogle() {
    return this.signInWithProvider('google');
  },

  async signInWithGithub() {
    return this.signInWithProvider('github');
  },

  /**
   * Échange le code d'autorisation OAuth 2.0 reçu via deep link contre une session.
   * À appeler depuis le handler de deep link dans App.tsx.
   */
  async handleOAuthCallback(url: string | null) {
    if (!url) return false;
    if (!url.startsWith('com.kabodmusic.app://auth/callback')) return false;

    try {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      if (!code) return false;

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn('OAuth callback:', error);
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
