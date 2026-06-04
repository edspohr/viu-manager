import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import type { useAuth } from '../../lib/useAuth';
type AuthState = ReturnType<typeof useAuth>;
import { cn } from '../../lib/utils';

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
    <div className="min-h-screen flex font-sans">
      {/* Left: Brand hero (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-ink overflow-hidden">
        {/* Ambient gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,199,44,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,199,44,0.08),transparent_55%)]" />

        {/* Grain noise */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo top */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3"
          >
            <img src="/viu-logo.png" alt="VIU" className="w-11 h-11 rounded-xl shadow-lg" />
            <div className="text-white font-bold text-xl tracking-tight">VIU<span className="text-viu-500">.</span></div>
          </motion.div>

          {/* Hero copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 max-w-md"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-zinc-300 backdrop-blur-sm">
              <Sparkles size={12} className="text-viu-500" />
              <span>Cotizaciones con IA</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tightest text-white leading-[1.05]">
              Cotiza más rápido,<br />
              <span className="text-viu-500">vende más</span>.
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed">
              Sube los documentos del cliente y deja que la IA arme la cotización por ti.
              Aprueba, envía y firma — todo en un solo lugar.
            </p>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="text-xs text-zinc-600"
          >
            VIU Print Ltda. · Impresión de gran formato
          </motion.div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-surface relative">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile-only logo */}
          <div className="flex lg:hidden flex-col items-center gap-3 mb-8">
            <img src="/viu-logo.png" alt="VIU" className="w-14 h-14 rounded-2xl shadow-raised" />
            <div className="text-ink font-bold text-xl tracking-tight">VIU<span className="text-viu-600">.</span></div>
          </div>

          <div className="mb-8">
            <h2 className="text-h1 text-ink">
              {mode === 'login' ? 'Bienvenido' : 'Crear cuenta'}
            </h2>
            <p className="text-sm text-zinc-500 mt-1.5">
              {mode === 'login'
                ? 'Inicia sesión para gestionar tus cotizaciones'
                : 'Regístrate para acceder al portal interno'}
            </p>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white text-ink rounded-xl font-medium text-sm border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60 transition-all duration-150 shadow-soft"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-zinc-400 text-[11px] uppercase tracking-wider font-medium">o con correo</span>
            <div className="h-px flex-1 bg-zinc-200" />
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs"
              >
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-viu-500 hover:bg-viu-400 active:bg-viu-600 disabled:opacity-60 text-ink font-bold rounded-xl text-sm transition-all duration-150 shadow-viu-soft hover:shadow-md"
            >
              {submitting
                ? 'Cargando...'
                : mode === 'login'
                ? 'Iniciar sesión'
                : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-500 mt-6">
            {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-semibold text-ink hover:text-viu-700 transition-colors"
            >
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FieldInput({
  icon, type, placeholder, value, onChange, required,
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
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={cn(
          'w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm text-ink placeholder:text-zinc-400 transition-all duration-150',
          'focus:outline-none focus:border-viu-500 focus:ring-4 focus:ring-viu-500/15'
        )}
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
