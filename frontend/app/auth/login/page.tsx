'use client';

import Link from 'next/link';
import { FormEvent, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthInput from '@/components/auth/AuthInput';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '@/components/auth/AuthIcons';
import AuthShell from '@/components/auth/AuthShell';
import AuthTabs from '@/components/auth/AuthTabs';
import SocialButtons from '@/components/auth/SocialButtons';
import { ArrowRightIcon } from '@/components/booking/Icons';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithOAuth } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const oauthCalled = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code && !oauthCalled.current) {
      const provider = localStorage.getItem('oauth_provider');
      if (provider === 'google' || provider === 'facebook') {
        oauthCalled.current = true;
        const handleOAuthLogin = async () => {
          setOauthLoading(true);
          setSubmitting(true);
          setServerError('');
          let success = false;
          try {
            const redirectUri = `${window.location.origin}/auth/login`;
            const storedRole = localStorage.getItem('oauth_role');
            const role = storedRole === 'LANDLORD' ? 'LANDLORD' : 'TENANT';
            const data = await loginWithOAuth(provider, code, redirectUri, role);
            localStorage.removeItem('oauth_provider');
            localStorage.removeItem('oauth_role');
            const redirectParam = params.get('redirect');
            if (data?.user?.role === 'LANDLORD') {
              router.push('/host');
            } else if (redirectParam) {
              router.push(redirectParam);
            } else {
              router.push('/');
            }
          } catch (err: any) {
            setServerError(err.message || 'Đăng nhập qua mạng xã hội thất bại. Vui lòng thử lại.');
            oauthCalled.current = false;
          } finally {
            setOauthLoading(false);
            setSubmitting(false);
            if (!success) {
              router.replace('/auth/login');
            }
          }
        };
        handleOAuthLogin();
      }
    }
  }, [router, loginWithOAuth]);

  const errors = {
    email: submitted && !email.trim() ? 'Vui lòng nhập email hoặc số điện thoại.' : '',
    password: submitted && !password ? 'Vui lòng nhập mật khẩu.' : '',
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setServerError('');
    
    if (!email.trim() || !password) return;

    setSubmitting(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (loggedInUser?.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (loggedInUser?.role === 'LANDLORD') {
        router.push('/host');
      } else if (redirect) {
        router.push(redirect);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setServerError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <AuthTabs active="login" />
      <h1 className="text-2xl font-bold">Chào mừng trở lại</h1>
      <p className="mt-4 text-sm leading-6 text-booking-muted">Đăng nhập để quản lý đặt phòng và trải nghiệm cá nhân hóa.</p>

      {oauthLoading && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium flex items-center justify-center gap-2 animate-pulse">
          <span className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
          Đang kết nối tài khoản mạng xã hội của bạn...
        </div>
      )}

      {serverError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
          {serverError}
        </div>
      )}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Email hoặc Số điện thoại"
          value={email}
          onChange={setEmail}
          placeholder="Nhập email hoặc SĐT"
          error={errors.email}
          icon={<MailIcon className="h-5 w-5 shrink-0" />}
        />
        <AuthInput
          label="Mật khẩu"
          value={password}
          onChange={setPassword}
          placeholder="Nhập mật khẩu"
          type={showPassword ? 'text' : 'password'}
          error={errors.password}
          icon={<LockIcon className="h-5 w-5 shrink-0" />}
          right={<Link href="/auth/forgot-password" tabIndex={-1} className="normal-case tracking-normal text-booking-primary">Quên mật khẩu?</Link>}
          suffix={
            <button
              type="button"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onClick={() => setShowPassword((value) => !value)}
              className="text-booking-muted hover:text-booking-text transition-colors flex items-center justify-center shrink-0"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        />
        <button
          type="submit"
          disabled={submitting}
          className="!mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-booking-primary px-5 py-4 font-bold text-white shadow-sm transition hover:bg-booking-primaryDark disabled:cursor-wait disabled:opacity-70"
        >
          {submitting ? 'Đang xử lý...' : 'Đăng nhập'}
          <ArrowRightIcon />
        </button>
      </form>

      <div className="my-8 flex items-center gap-4 text-sm text-booking-muted">
        <span className="h-px flex-1 bg-booking-border" />
        hoặc tiếp tục với
        <span className="h-px flex-1 bg-booking-border" />
      </div>
      <SocialButtons mode="Đăng nhập" />
      <p className="mt-6 text-center text-sm text-booking-muted">
        Chưa có tài khoản?{' '}
        <Link href="/auth/register" className="font-bold text-booking-primary">
          Đăng ký ngay
        </Link>
      </p>
    </AuthShell>
  );
}
