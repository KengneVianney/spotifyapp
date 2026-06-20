import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StatusBar,
  ScrollView,
} from 'react-native';
import { authService } from '../services/authService';
import { GoogleIcon, GitHubIcon } from '../components/SocialIcons';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateToSignUp: () => void;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen({ onLoginSuccess, onNavigateToSignUp }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateField = (name: string, value: string): string => {
    if (name === 'email') {
      if (!value.trim()) return 'L\'email est obligatoire.';
      if (!EMAIL_REGEX.test(value.trim())) return 'Format d\'email invalide (ex: nom@domaine.com).';
    }
    if (name === 'password') {
      if (!value) return 'Le mot de passe est obligatoire.';
    }
    return '';
  };

  const validateAll = (): boolean => {
    const errors: FieldErrors = {
      email: validateField('email', email),
      password: validateField('password', password),
    };
    setFieldErrors(errors);
    setTouched({ email: true, password: true });
    return !errors.email && !errors.password;
  };

  const handleBlur = (name: string, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleChangeEmail = (val: string) => {
    setEmail(val);
    if (touched.email) {
      setFieldErrors(prev => ({ ...prev, email: validateField('email', val) }));
    }
  };

  const handleChangePassword = (val: string) => {
    setPassword(val);
    if (touched.password) {
      setFieldErrors(prev => ({ ...prev, password: validateField('password', val) }));
    }
  };

  const handleLogin = async () => {
    setServerError('');
    if (!validateAll()) return;
    setLoading(true);
    try {
      await authService.signIn(email.trim(), password);
      onLoginSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion. Vérifie tes identifiants.';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setServerError('');
    setLoading(true);
    try {
      await authService.signInWithGoogle();
      onLoginSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion Google.';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setServerError('');
    setLoading(true);
    try {
      await authService.signInWithGitHub();
      onLoginSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion GitHub.';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: keyof FieldErrors) => [
    styles.input,
    touched[field] && fieldErrors[field] ? styles.inputInvalid : null,
    touched[field] && !fieldErrors[field] && (field === 'email' ? email : password)
      ? styles.inputValid
      : null,
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoWrap}>
                <Text style={styles.logoIcon}>♫</Text>
              </View>
              <Text style={styles.appName}>Spotify</Text>
              <Text style={styles.tagline}>Ecouter des millions de titres</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Connexion</Text>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, touched.email && fieldErrors.email ? styles.labelError : null]}>
                  Email
                </Text>
                <TextInput
                  style={inputStyle('email')}
                  placeholder="ton@email.com"
                  placeholderTextColor="#444"
                  value={email}
                  onChangeText={handleChangeEmail}
                  onBlur={() => handleBlur('email', email)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {touched.email && fieldErrors.email ? (
                  <Text style={styles.inlineError}>⚠ {fieldErrors.email}</Text>
                ) : null}
              </View>

              {/* Mot de passe */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, touched.password && fieldErrors.password ? styles.labelError : null]}>
                  Mot de passe
                </Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    style={[inputStyle('password'), styles.passwordInput]}
                    placeholder="••••••••"
                    placeholderTextColor="#444"
                    value={password}
                    onChangeText={handleChangePassword}
                    onBlur={() => handleBlur('password', password)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                    <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                {touched.password && fieldErrors.password ? (
                  <Text style={styles.inlineError}>⚠ {fieldErrors.password}</Text>
                ) : null}
              </View>

              {/* Erreur serveur */}
              {serverError !== '' && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{serverError}</Text>
                </View>
              )}

              {/* Bouton connexion email */}
              <TouchableOpacity
                style={[styles.btnPrimary, loading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Se connecter</Text>
                )}
              </TouchableOpacity>

              {/* Séparateur */}
              <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>ou</Text>
                <View style={styles.separatorLine} />
              </View>

             {/* Bouton Google */}
             <TouchableOpacity
                style={[styles.btnOAuth, loading && styles.btnDisabled]}
                onPress={handleGoogleLogin}
                disabled={loading}
                activeOpacity={0.85}>
                <View style={styles.btnOAuthContent}>
                <GoogleIcon size={20} />
                <Text style={styles.btnOAuthText}>Continuer avec Google</Text>
                </View>
              </TouchableOpacity>

              {/* Bouton GitHub */}
              <TouchableOpacity
                style={[styles.btnOAuth, styles.btnOAuthGitHub, loading && styles.btnDisabled]}
                onPress={handleGitHubLogin}
                disabled={loading}
                activeOpacity={0.85}>
                <View style={styles.btnOAuthContent}>
                  <GitHubIcon size={20} />
                  <Text style={styles.btnOAuthText}>Continuer avec GitHub</Text>
                </View>
              </TouchableOpacity>
              {/* Lien inscription */}
              <TouchableOpacity onPress={onNavigateToSignUp} style={styles.linkBtn}>
                <Text style={styles.linkText}>
                  Pas encore de compte ?{' '}
                  <Text style={styles.linkHighlight}>Créer un compte</Text>
                </Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  bgCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#3aed4f', opacity: 0.12, top: -80, right: -80,
  },
  bgCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#06B6D4', opacity: 0.08, bottom: 100, left: -60,
  },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  header: { alignItems: 'center', marginBottom: 36 },
  logoWrap: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#3aed4f',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#3aed4f', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 12,
  },
  logoIcon: { fontSize: 28, color: '#fff' },
  appName: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 14, color: '#666', marginTop: 4, letterSpacing: 0.5 },
  card: {
    backgroundColor: '#13131A', borderRadius: 24, padding: 28,
    borderWidth: 1, borderColor: '#1E1E2E', marginBottom: 40,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 12, color: '#888', marginBottom: 8,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  labelError: { color: '#F87171' },
  input: {
    backgroundColor: '#0F0F18', borderRadius: 12, borderWidth: 1,
    borderColor: '#2A2A3E', paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#fff',
  },
  inputInvalid: { borderColor: '#EF4444', backgroundColor: '#1A0F0F' },
  inputValid: { borderColor: '#10B981' },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: { position: 'absolute', right: 14, top: 12, padding: 4 },
  eyeText: { fontSize: 18 },
  inlineError: { color: '#F87171', fontSize: 12, marginTop: 6 },
  errorBox: {
    backgroundColor: '#2D0F0F', borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#5C1E1E',
  },
  errorText: { color: '#F87171', fontSize: 13, textAlign: 'center' },
  btnPrimary: {
    backgroundColor: '#3aed4f', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: '#3aed4f', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  separator: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#1E1E2E' },
  separatorText: { color: '#444', marginHorizontal: 12, fontSize: 13 },
  btnOAuth: {
    backgroundColor: '#1E1E2E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
    marginBottom: 12,
  },
  btnOAuthGitHub: {
    marginBottom: 20,
  },
  btnOAuthText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  btnOAuthContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkBtn: { alignItems: 'center' },
  linkText: { color: '#666', fontSize: 14 },
  linkHighlight: { color: '#3aed4f', fontWeight: '600' },
});