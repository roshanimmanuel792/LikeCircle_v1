
import React, { useState } from 'react';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { User } from '../types';
import { authService } from '../services/authService';

interface Props {
  onLogin: (user: User) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError(null);
    try {
      const user = await authService.loginWithGoogleToken(credentialResponse);
      onLogin(user);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setLoading(false);
    }
  };

  const handleGoogleLoginError = () => {
    setError('Failed to sign in with Google. Please try again.');
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full glass p-10 rounded-[3rem] text-center space-y-8">
        <div className="space-y-3">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#d4a373] to-[#a98467] rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-[#d4a373]/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#2d1b10] font-outfit">LikeCircle</h1>
          <p className="text-[#5c5852] text-sm">Where your thoughts are heard, but you stay anonymous.</p>
        </div>

        <div className="w-full flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginError}
            text="signin"
            size="large"
            width="100%"
          />
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="pt-8 text-xs text-[#8d8a85] max-w-xs mx-auto">
          By continuing, you agree to our <span className="underline cursor-pointer">Terms</span> and <span className="underline cursor-pointer">Privacy Policy</span>. Your real identity will never be visible to others.
        </div>
      </div>
    </div>
  );
};

export default Login;
