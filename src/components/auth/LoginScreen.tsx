import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { useAuth } from '../../lib/useAuth';
type AuthState = ReturnType<typeof useAuth>;
import { cn } from '../../lib/utils';

// Inline the logo as SVG/img data
const VIU_LOGO = '/viu-logo.png';

interface LoginScreenProps {
  auth: AuthState;
}

type Mode = 'login' | 'register';

export function LoginScreen({ auth }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (mode === 'login') {
      await auth.signInWithEmail(email, password);
    } else {
      await auth.registerWithEmail(email, password, name);
    }
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    await auth.signInWithGoogle();
    setSubmitting(false);
  };

  const errorMsg = auth.error
    ? auth.error.includes('user-not-found') || auth.error.includes('wrong-password') || auth.error.includes('invalid-credential')
      ? 'Correo o contraseña incorrectos'
      : auth.error.includes('email-already-in-use')
      ? 'Este correo ya tiene una cuenta registrada'
      : auth.error.includes('weak-password')
      ? 'La contraseña debe tener al menos 6 caracteres'
      : 'Error al iniciar sesión. Intenta nuevamente.'
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Background grain */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_#27272a_0%,_#09090b_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <img
            src={VIU_LOGO}
            alt="VIU Print"
            className="w-16 h-16 rounded-2xl shadow-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="text-center">
            <h1 className="text-white font-bold text-2xl tracking-tight">VIU Manager</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Portal interno VIU Print</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-zinc-800">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 py-3.5 text-sm font-medium transition-colors',
                  mode === m
                    ? 'text-white bg-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">
            {/* Google button */}
            <button
              onClick={handleGoogle}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 bg-white text-zinc-900 rounded-xl font-medium text-sm hover:bg-zinc-100 disabled:opacity-60 transition-colors shadow-sm"
            >
              <GoogleIcon />
              Continuar con Google
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-zinc-600 text-xs">o con correo</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <FieldInput
                      icon={<User size={15} />}
                      type="text"
                      placeholder="Nombre completo"
                      value={name}
                      onChange={setName}
                      required={mode === 'register'}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <FieldInput
                icon={<Mail size={15} />}
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={setEmail}
                required
              />

              <div className="relative">
                <FieldInput
                  icon={<Lock size={15} />}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={password}
                  onChange={setPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-400 text-xs"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  {errorMsg}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-zinc-900 font-semibold rounded-xl text-sm transition-colors shadow-md"
              >
                {submitting
                  ? 'Cargando...'
                  : mode === 'login'
                  ? 'Iniciar sesión'
                  : 'Crear cuenta'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          VIU Print · Uso interno exclusivo
        </p>
      </motion.div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FieldInput({
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-colors"
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
