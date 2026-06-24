'use client';

export default function SocialButtons({
  mode,
  role = 'TENANT',
}: {
  mode: 'Đăng nhập' | 'Đăng ký';
  role?: 'TENANT' | 'LANDLORD';
}) {
  const handleOAuthRedirect = (provider: 'google' | 'facebook') => {
    if (typeof window === 'undefined') return;

    // Use current origin to construct redirect URI
    const redirectUri = `${window.location.origin}/auth/login`;
    localStorage.setItem('oauth_provider', provider);
    // Vai trò chỉ áp dụng khi tạo tài khoản OAuth mới (chủ yếu từ trang Đăng ký).
    localStorage.setItem('oauth_role', role);

    let authUrl = '';
    if (provider === 'google') {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'DUMMY_GOOGLE_CLIENT_ID';
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${encodeURIComponent('openid email profile')}&prompt=select_account`;
    } else if (provider === 'facebook') {
      const clientId = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || 'DUMMY_FACEBOOK_CLIENT_ID';
      authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${encodeURIComponent('email,public_profile')}`;
    }

    if (authUrl) {
      window.location.href = authUrl;
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => handleOAuthRedirect('google')}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-booking-border bg-booking-surface px-4 py-2.5 font-bold text-booking-text shadow-sm transition hover:border-booking-primary"
      >
        <span className="grid h-5 w-5 place-items-center rounded-sm bg-white text-xs shadow-sm">G</span>
        {mode} bằng Google
      </button>
      <button
        type="button"
        onClick={() => handleOAuthRedirect('facebook')}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-booking-border bg-booking-surface px-4 py-2.5 font-bold text-booking-text shadow-sm transition hover:border-booking-primary"
      >
        <span className="grid h-5 w-5 place-items-center rounded-sm bg-[#4267b2] text-xs text-white">f</span>
        {mode} bằng Facebook
      </button>
    </div>
  );
}
