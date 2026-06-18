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
import { GoogleIcon, GithubIcon } from '../components/Icons';

// Regex email complète : vérifie format local@domaine.ext
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface SignUpScreenProps {
  onSignUpSuccess: () => void;
  onNavigateToLogin: () => void;
}

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function SignUpScreen({ onSignUpSuccess, onNavigateToLogin }: SignUpScreenProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const validateField = (name: string, value: string, extra?: string): string => {
    switch (name) {
      case 'username':
        if (!value.trim()) return "Le nom d'utilisateur est obligatoire.";
        if (value.trim().length < 3) return "Minimum 3 caractères.";
        if (/\s/.test(value)) return "Pas d'espaces autorisés.";
        return '';
      case 'email':
        if (!value.trim()) return "L'email est obligatoire.";
        if (!EMAIL_REGEX.test(value.trim())) return "Format invalide (ex: nom@domaine.com).";
        return '';
      case 'password':
        if (!value) return "Le mot de passe est obligatoire.";
        if (value.length < 6) return "Minimum 6 caractères.";
        return '';
      case 'confirmPassword':
        if (!value) return "Confirme ton mot de passe.";
        if (value !== extra) return "Les mots de passe ne correspondent pas.";
        return '';
      default:
        return '';
    }
  };

  const validateAll = (): boolean => {
    const errors: FieldErrors = {
      username: validateField('username', username),
      email: validateField('email', email),
      password: validateField('password', password),
      confirmPassword: validateField('confirmPassword', confirmPassword, password),
    };
    setFieldErrors(errors);
    setTouched({ username: true, email: true, password: true, confirmPassword: true });
    return !errors.username && !errors.email && !errors.password && !errors.confirmPassword;
  };

  const handleBlur = (name: string, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const err = validateField(name, value, name === 'confirmPassword' ? password : undefined);
    setFieldErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleChange = (name: string, value: string) => {
    const setters: Record<string, (v: string) => void> = {
      username: setUsername,
      email: setEmail,
      password: setPassword,
      confirmPassword: setConfirmPassword,
    };
    setters[name]?.(value);
    if (touched[name]) {
      const extra = name === 'confirmPassword' ? password : name === 'password' ? confirmPassword : undefined;
      setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value, extra) }));
      // re-valider confirmPassword si on modifie password
      if (name === 'password' && touched.confirmPassword) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: validateField('confirmPassword', confirmPassword, value) }));
      }
    }
  };

  const handleSignUp = async () => {
    setServerError('');
    if (!validateAll()) return;
    setLoading(true);
    try {
      await authService.signUp(email.trim(), password, username.trim(), '');
      setSuccess(true);
    } catch (err: any) {
      setServerError(err.message || "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: keyof FieldErrors, extra?: string) => [
    styles.input,
    touched[field] && fieldErrors[field] ? styles.inputInvalid : null,
    touched[field] && !fieldErrors[field] && extra ? styles.inputValid : null,
  ];

  const strengthLevel = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: 'Faible', color: '#EF4444', width: '30%' };
    if (password.length < 10) return { label: 'Moyen', color: '#F59E0B', width: '65%' };
    return { label: 'Fort', color: '#10B981', width: '100%' };
  };
  const strength = strengthLevel();

  // Écran succès
  if (success) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
        <View style={styles.bgCircle1} />
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✉️</Text>
          </View>
          <Text style={styles.successTitle}>Compte créé !</Text>
          <Text style={styles.successText}>
            Un email de confirmation a été envoyé à{'\n'}
            <Text style={styles.successEmail}>{email}</Text>
          </Text>
          <Text style={styles.successHint}>Vérifie ta boîte mail puis reviens te connecter.</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={onNavigateToLogin}>
            <Text style={styles.btnPrimaryText}>Aller à la connexion</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={onNavigateToLogin}>
                <Text style={styles.backText}>← Retour</Text>
              </TouchableOpacity>
              <View style={styles.logoWrap}>
                <Text style={styles.logoIcon}>♫</Text>
              </View>
              <Text style={styles.appName}>Spotify</Text>
              <Text style={styles.tagline}>Ecouter des millions de titres</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Inscription</Text>

              {/* Username */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, touched.username && fieldErrors.username ? styles.labelError : null]}>
                  Nom d'utilisateur
                </Text>
                <TextInput
                  style={inputStyle('username', username)}
                  placeholder="ton_username"
                  placeholderTextColor="#444"
                  value={username}
                  onChangeText={v => handleChange('username', v)}
                  onBlur={() => handleBlur('username', username)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {touched.username && fieldErrors.username ? (
                  <Text style={styles.inlineError}>⚠ {fieldErrors.username}</Text>
                ) : null}
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, touched.email && fieldErrors.email ? styles.labelError : null]}>
                  Email
                </Text>
                <TextInput
                  style={inputStyle('email', email)}
                  placeholder="ton@email.com"
                  placeholderTextColor="#444"
                  value={email}
                  onChangeText={v => handleChange('email', v)}
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
                    style={[inputStyle('password', password), styles.passwordInput]}
                    placeholder="••••••••"
                    placeholderTextColor="#444"
                    value={password}
                    onChangeText={v => handleChange('password', v)}
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

              {/* Confirmation */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, touched.confirmPassword && fieldErrors.confirmPassword ? styles.labelError : null]}>
                  Confirmer le mot de passe
                </Text>
                <TextInput
                  style={inputStyle('confirmPassword', confirmPassword)}
                  placeholder="••••••••"
                  placeholderTextColor="#444"
                  value={confirmPassword}
                  onChangeText={v => handleChange('confirmPassword', v)}
                  onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                {touched.confirmPassword && fieldErrors.confirmPassword ? (
                  <Text style={styles.inlineError}>⚠ {fieldErrors.confirmPassword}</Text>
                ) : null}
              </View>

              {/* Erreur serveur */}
              {serverError !== '' && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{serverError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btnPrimary, loading && styles.btnDisabled]}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Créer mon compte</Text>
                )}
              </TouchableOpacity>

              {/* Social SignUp */}
              <View style={styles.socialRow}>
                <Text style={styles.socialLabel}>Ou continuer avec</Text>
                <View style={styles.socialBtns}>
                  <TouchableOpacity
                    style={[styles.socialBtn, styles.socialBtnGoogle]}
                    onPress={async () => {
                      try { setLoading(true); await authService.signInWithGoogle(); }
                      catch (err: any) { setServerError(err.message || 'Erreur Google.'); }
                      finally { setLoading(false); }
                    }}
                    disabled={loading}
                    activeOpacity={0.85}>
                    <GoogleIcon size={22} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.socialBtn, styles.socialBtnGithub]}
                    onPress={async () => {
                      try { setLoading(true); await authService.signInWithGithub(); }
                      catch (err: any) { setServerError(err.message || 'Erreur GitHub.'); }
                      finally { setLoading(false); }
                    }}
                    disabled={loading}
                    activeOpacity={0.85}>
                    <GithubIcon size={22} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity onPress={onNavigateToLogin} style={styles.linkBtn}>
                <Text style={styles.linkText}>
                  Déjà un compte ?{' '}
                  <Text style={styles.linkHighlight}>Se connecter</Text>
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
    backgroundColor: '#06B6D4', opacity: 0.1, top: -80, left: -80,
  },
  bgCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#3aed4f', opacity: 0.08, bottom: 60, right: -60,
  },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28, position: 'relative' },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 16 },
  backText: { color: '#3aed4f', fontSize: 15, fontWeight: '600' },
  logoWrap: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: '#3aed4f',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    shadowColor: '#3aed4f', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  logoIcon: { fontSize: 24, color: '#fff' },
  appName: { fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 13, color: '#666', marginTop: 4 },
  card: {
    backgroundColor: '#13131A', borderRadius: 24, padding: 28,
    borderWidth: 1, borderColor: '#1E1E2E',
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
  strengthWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  strengthBar: {
    flex: 1, height: 4, backgroundColor: '#1E1E2E',
    borderRadius: 2, overflow: 'hidden',
  },
  strengthFill: { height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, minWidth: 42 },
  errorBox: {
    backgroundColor: '#2D0F0F', borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#5C1E1E',
  },
  errorText: { color: '#F87171', fontSize: 13, textAlign: 'center' },
  btnPrimary: {
    backgroundColor: '#3aed4f', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#3aed4f', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  socialRow: { alignItems: 'center', marginTop: 16 },
  socialLabel: { fontSize: 12, color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  socialBtns: { flexDirection: 'row', gap: 16 },
  socialBtn: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2A2A3E', backgroundColor: '#0F0F18',
  },
  socialBtnGoogle: {},
  socialBtnGithub: {},
  linkBtn: { alignItems: 'center', marginTop: 20 },
  linkText: { color: '#666', fontSize: 14 },
  linkHighlight: { color: '#3aed4f', fontWeight: '600' },
  // Succès
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successIcon: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#13131A',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: '#1E1E2E',
  },
  successEmoji: { fontSize: 36 },
  successTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 12 },
  successText: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  successEmail: { color: '#3aed4f', fontWeight: '600' },
  successHint: { fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 36 },
});
