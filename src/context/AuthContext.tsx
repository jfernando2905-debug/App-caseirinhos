import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export interface AuthErrorInfo {
  code: string;
  title: string;
  message: string;
  actionGuide?: string;
  isFirebaseSetupIssue?: boolean;
}

export function translateAuthError(error: any): AuthErrorInfo {
  const code = error?.code || '';
  const rawMessage = error?.message || String(error);

  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      title: 'Método de login não ativado no Firebase',
      message: 'O provedor selecionado (Google ou E-mail/Senha) ainda não foi ativado no Firebase Console.',
      actionGuide:
        'Acesse o Firebase Console > Authentication > Sign-in method (Métodos de login) e ative o provedor Google e/ou E-mail/senha.',
      isFirebaseSetupIssue: true,
    };
  }

  if (code === 'auth/unauthorized-domain') {
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
    return {
      code,
      title: 'Domínio não autorizado no Firebase',
      message: `O endereço "${currentDomain}" ainda não está na lista de domínios autorizados para autenticação OAuth no Firebase.`,
      actionGuide: `Acesse o Firebase Console > Authentication > Settings (Configurações) > Authorized domains (Domínios autorizados) e adicione o domínio: ${currentDomain}`,
      isFirebaseSetupIssue: true,
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      code,
      title: 'Pop-up bloqueado pelo navegador',
      message: 'O navegador impediu a abertura da janela de login do Google.',
      actionGuide: 'Permita pop-ups para este site ou utilize a opção de login por E-mail e Senha.',
    };
  }

  if (code === 'auth/popup-closed-by-user') {
    return {
      code,
      title: 'Janela de login fechada',
      message: 'A janela de autenticação foi fechada antes de concluir o login. Tente novamente.',
    };
  }

  if (code === 'auth/cancelled-popup-request') {
    return {
      code,
      title: 'Tentativa anterior cancelada',
      message: 'Uma tentativa anterior de abertura de pop-up ainda estava em andamento. Tente novamente.',
    };
  }

  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return {
      code,
      title: 'E-mail ou senha incorretos',
      message:
        'Não foi possível autenticar com esses dados. Se você ainda não possui cadastro, clique em "Criar nova conta".',
    };
  }

  if (code === 'auth/email-already-in-use') {
    return {
      code,
      title: 'E-mail já cadastrado',
      message: 'Já existe uma conta com este e-mail. Faça login ou redefina sua senha.',
    };
  }

  if (code === 'auth/weak-password') {
    return {
      code,
      title: 'Senha muito curta',
      message: 'A senha informada deve ter pelo menos 6 caracteres.',
    };
  }

  if (code === 'auth/invalid-email') {
    return {
      code,
      title: 'E-mail inválido',
      message: 'O formato do e-mail digitado não é válido. Verifique se digitou corretamente.',
    };
  }

  if (code === 'auth/too-many-requests') {
    return {
      code,
      title: 'Muitas tentativas',
      message:
        'O acesso a esta conta foi temporariamente bloqueado devido a muitas tentativas incorretas. Aguarde alguns minutos ou redefina sua senha.',
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      code,
      title: 'Falha de conexão',
      message: 'Não foi possível conectar aos servidores do Firebase. Verifique sua conexão com a internet.',
    };
  }

  return {
    code,
    title: 'Falha na autenticação',
    message: rawMessage.replace(/^Firebase:\s*/, '').replace(/\(auth\/[a-z0-9-]+\)\.?/i, '').trim() || rawMessage,
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  projectId: string;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  projectId: firebaseConfig.projectId || '',
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  sendPasswordReset: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (error: any) {
      console.error('Email Sign-in failed:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (name && cred.user) {
        try {
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch {
          // Non-critical if display name update fails
        }
      }
    } catch (error: any) {
      console.error('Sign-up failed:', error);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error: any) {
      console.error('Password reset failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (error: any) {
      console.error('Sign-out failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        projectId: firebaseConfig.projectId || '',
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
