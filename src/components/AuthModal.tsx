import React, { useState } from 'react';
import {
  X,
  Cloud,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { useAuth, translateAuthError, AuthErrorInfo } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const {
    projectId,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyHost = () => {
    if (navigator?.clipboard && currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      if (onSuccessToast) onSuccessToast('Login com Google realizado com sucesso! Seus dados estão salvos na nuvem.');
      onClose();
    } catch (err: any) {
      const translated = translateAuthError(err);
      setAuthError(translated);
      if (translated.isFirebaseSetupIssue) {
        setShowGuide(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        if (onSuccessToast) onSuccessToast('Login efetuado com sucesso! Dados sincronizados na nuvem.');
        onClose();
      } else if (mode === 'signup') {
        if (password.length < 6) {
          setAuthError({
            code: 'auth/weak-password',
            title: 'Senha muito curta',
            message: 'A senha deve conter no mínimo 6 caracteres.',
          });
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, name);
        if (onSuccessToast) onSuccessToast('Conta criada com sucesso! Seus dados foram salvos na nuvem.');
        onClose();
      } else if (mode === 'forgot') {
        await sendPasswordReset(email);
        if (onSuccessToast) onSuccessToast('Link de recuperação de senha enviado para seu e-mail!');
        setMode('login');
      }
    } catch (err: any) {
      const translated = translateAuthError(err);
      setAuthError(translated);
      if (translated.isFirebaseSetupIssue) {
        setShowGuide(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                {mode === 'login' && 'Entrar na sua Conta'}
                {mode === 'signup' && 'Criar Conta na Nuvem'}
                {mode === 'forgot' && 'Recuperar Senha'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Sincronize receitas, custos e encomendas entre celulares e PCs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Error Banner with Actionable Firebase Guidance */}
          {authError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs space-y-2 text-rose-800 dark:text-rose-200">
              <div className="flex items-start gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{authError.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-95">
                {authError.message}
              </p>

              {authError.actionGuide && (
                <div className="mt-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/60 font-medium text-[11px]">
                  👉 {authError.actionGuide}
                </div>
              )}
            </div>
          )}

          {/* Quick Google Sign In */}
          {mode !== 'forgot' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-700 rounded-2xl font-semibold text-stone-700 dark:text-stone-200 shadow-xs transition-all active:scale-[0.99] disabled:opacity-60 text-sm min-h-[46px]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Conectando...' : 'Entrar com o Google'}</span>
              </button>

              <div className="relative flex items-center py-2">
                <div className="grow border-t border-stone-200 dark:border-stone-800" />
                <span className="shrink-0 px-3 text-[11px] uppercase tracking-wider text-stone-400 font-medium">
                  ou com e-mail e senha
                </span>
                <div className="grow border-t border-stone-200 dark:border-stone-800" />
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nome ou Nome da Confeitaria
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Doces da Maria"
                    className="w-full pl-10 pr-3 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-10 pr-3 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setMode('forgot');
                      }}
                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Mínimo de 6 caracteres' : '••••••••'}
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-2xl shadow-sm transition-all active:scale-[0.99] text-sm disabled:opacity-60 min-h-[46px]"
            >
              {loading && 'Processando...'}
              {!loading && mode === 'login' && 'Entrar com E-mail'}
              {!loading && mode === 'signup' && 'Cadastrar e Conectar'}
              {!loading && mode === 'forgot' && 'Enviar link de recuperação'}
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="text-center pt-2 text-xs text-stone-500 dark:text-stone-400 space-y-1">
            {mode === 'login' && (
              <p>
                Não tem uma conta ainda?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setMode('signup');
                  }}
                  className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Criar conta grátis
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Já tem uma conta criada?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setMode('login');
                  }}
                  className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Fazer Login
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                Lembrou a senha?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setMode('login');
                  }}
                  className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Voltar ao Login
                </button>
              </p>
            )}
          </div>

          {/* Firebase Authorization Accordion / Help Section */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between p-2.5 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                Precisa autorizar algo no Firebase? Veja o passo a passo
              </span>
              {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showGuide && (
              <div className="mt-2.5 p-3.5 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs space-y-3">
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  <strong>Sim!</strong> Para o login funcionar pela primeira vez em um novo projeto Firebase, você precisa ativar os métodos de login e autorizar o domínio no Console do Firebase:
                </p>

                <div className="space-y-2">
                  <div className="p-2.5 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 space-y-1.5">
                    <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                      Ativar Método de Login (Sign-in method)
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      No Firebase Console, acesse <strong>Authentication &gt; Sign-in method</strong> e clique para ativar <strong>Google</strong> e/ou <strong>E-mail/senha</strong>.
                    </p>
                    {projectId && (
                      <a
                        href={`https://console.firebase.google.com/project/${projectId}/authentication/providers`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline pt-0.5"
                      >
                        Abrir Métodos de Login no Firebase <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="p-2.5 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 space-y-1.5">
                    <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                      Adicionar Domínio Autorizado (Authorized domains)
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      Em <strong>Authentication &gt; Settings &gt; Authorized domains</strong>, adicione o endereço do seu site (preview e/ou Vercel).
                    </p>
                    {currentHost && (
                      <div className="flex items-center justify-between gap-2 p-1.5 bg-stone-100 dark:bg-stone-900 rounded-lg text-[11px] font-mono">
                        <span className="truncate">{currentHost}</span>
                        <button
                          type="button"
                          onClick={handleCopyHost}
                          className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded font-sans text-[10px] text-stone-700 dark:text-stone-300 hover:bg-stone-50"
                        >
                          {copiedDomain ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedDomain ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}
                    {projectId && (
                      <a
                        href={`https://console.firebase.google.com/project/${projectId}/authentication/settings`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline pt-0.5"
                      >
                        Abrir Domínios Autorizados no Firebase <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    💡 <strong>Dica rápida:</strong> O login por <strong>E-mail e Senha</strong> não depende de domínios autorizados nem de pop-ups. Basta ativar "E-mail/senha" no Firebase e você já consegue criar sua conta imediatamente!
                  </div>

                  <div className="p-2.5 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed space-y-1">
                    <div>
                      🏷️ <strong>Sobre o nome &quot;{projectId}&quot;:</strong> Este é o identificador técnico gerado automaticamente pelo Google Cloud. O banco de dados foi criado especificamente para seu app (<span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">custodereceitas</span>).
                    </div>
                    {projectId && (
                      <div>
                        Você pode alterar o nome visual do projeto para <strong>Custo de Receitas</strong> quando quiser:{' '}
                        <a
                          href={`https://console.firebase.google.com/project/${projectId}/settings/general`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-0.5"
                        >
                          Renomear no Firebase <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
