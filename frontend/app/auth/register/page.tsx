'use client';

import Link from 'next/link';
import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthInput from '@/components/auth/AuthInput';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon, CalendarIcon, GenderIcon } from '@/components/auth/AuthIcons';
import AuthShell from '@/components/auth/AuthShell';
import AuthTabs from '@/components/auth/AuthTabs';
import SocialButtons from '@/components/auth/SocialButtons';
import { ArrowRightIcon } from '@/components/booking/Icons';
import { authService } from '@/services/authService';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [role, setRole] = useState<'TENANT' | 'LANDLORD'>('TENANT');
  
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Timer for resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const errors = {
    fullName: submitted && !fullName.trim() ? 'Vui lòng nhập họ và tên.' : '',
    username: submitted && !username.trim() ? 'Vui lòng nhập tên đăng nhập.' : '',
    email: submitted && !email.trim() ? 'Vui lòng nhập email.' : '',
    phoneNumber: submitted && !phoneNumber.trim() ? 'Vui lòng nhập số điện thoại.' : '',
    password: submitted && password.length < 8 ? 'Mật khẩu phải từ 8 ký tự trở lên.' : '',
    confirmPassword: submitted && password !== confirmPassword ? 'Mật khẩu xác nhận không khớp.' : '',
    gender: submitted && !gender ? 'Vui lòng chọn giới tính.' : '',
    dateOfBirth: submitted && !dateOfBirth ? 'Vui lòng chọn ngày sinh.' : '',
    otp: submitted && step === 2 && otp.length !== 6 ? 'Mã OTP gồm 6 chữ số.' : '',
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError('');
    setServerSuccess('');

    // Pre-check fields
    if (
      !fullName.trim() ||
      !username.trim() ||
      !email.trim() ||
      !phoneNumber.trim() ||
      password.length < 8 ||
      password !== confirmPassword ||
      !gender ||
      !dateOfBirth
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await authService.register({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        confirmPassword,
        gender,
        dateOfBirth,
        role,
      });

      setServerSuccess('Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP kích hoạt.');
      setCooldown(60); // 60s cooldown for resending
      setStep(2);
      setSubmitted(false);
    } catch (err: any) {
      setServerError(err.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError('');
    setServerSuccess('');

    if (otp.length !== 6) return;

    setSubmitting(true);
    try {
      await authService.verifyOtp(email.trim(), otp);
      setServerSuccess('Kích hoạt tài khoản thành công! Đang chuyển hướng về trang đăng nhập...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setServerError(err.message || 'Xác thực OTP thất bại.');
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setServerError('');
    setServerSuccess('');

    try {
      await authService.resendOtp(email.trim(), 'REGISTRATION');
      setServerSuccess('Mã OTP mới đã được gửi.');
      setCooldown(60);
    } catch (err: any) {
      setServerError(err.message || 'Gửi lại OTP thất bại.');
    }
  };

  return (
    <AuthShell>
      <AuthTabs active="register" />
      <h1 className="text-2xl font-bold">Tạo tài khoản mới</h1>
      <p className="mt-4 text-sm leading-6 text-booking-muted">
        {step === 1 
          ? 'Đăng ký để lưu phòng yêu thích, đặt lịch xem phòng và theo dõi giao dịch.'
          : 'Mã OTP đã được gửi về email của bạn. Vui lòng nhập mã OTP để kích hoạt tài khoản.'}
      </p>

      {serverError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
          {serverError}
        </div>
      )}

      {serverSuccess && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
          {serverSuccess}
        </div>
      )}

      {step === 1 ? (
        <form className="mt-5 space-y-4" onSubmit={handleRegister} noValidate>
          <div className="block">
            <span className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.05em] text-booking-text">
              Vai trò của bạn
            </span>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('TENANT')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${
                  role === 'TENANT'
                    ? 'border-[#0052CC] bg-[#EEF4FF] text-[#0052CC] font-bold shadow-sm'
                    : 'border-booking-border bg-booking-surface text-booking-muted hover:border-booking-muted'
                }`}
              >
                <svg className="w-6 h-6 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm">Người thuê</span>
              </button>
              
              <button
                type="button"
                onClick={() => setRole('LANDLORD')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${
                  role === 'LANDLORD'
                    ? 'border-[#0052CC] bg-[#EEF4FF] text-[#0052CC] font-bold shadow-sm'
                    : 'border-booking-border bg-booking-surface text-booking-muted hover:border-booking-muted'
                }`}
              >
                <svg className="w-6 h-6 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11V20a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-sm">Chủ nhà</span>
              </button>
            </div>
          </div>

          <AuthInput
            label="Họ và tên"
            value={fullName}
            onChange={setFullName}
            placeholder="Nhập họ tên"
            error={errors.fullName}
            icon={<UserIcon className="h-5 w-5 shrink-0" />}
          />
          
          <AuthInput
            label="Tên đăng nhập"
            value={username}
            onChange={setUsername}
            placeholder="Tối thiểu 3 ký tự (chữ thường, số, _, .)"
            error={errors.username}
            icon={
              <span className="grid h-5 w-5 place-items-center text-xs font-bold text-booking-muted select-none">
                @
              </span>
            }
          />

          <AuthInput
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="Nhập email đăng ký"
            error={errors.email}
            icon={<MailIcon className="h-5 w-5 shrink-0" />}
          />

          <AuthInput
            label="Số điện thoại"
            value={phoneNumber}
            onChange={setPhoneNumber}
            placeholder="Nhập số điện thoại"
            error={errors.phoneNumber}
            icon={
              <span className="grid h-5 w-5 place-items-center text-xs font-bold text-booking-muted select-none">
                #
              </span>
            }
          />

          <div className="block">
            <span className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.05em] text-booking-text">
              Giới tính
            </span>
            <span className={`flex min-h-11 items-center gap-3 rounded-lg border bg-booking-surface px-3 text-booking-muted transition focus-within:border-booking-primary ${errors.gender ? 'border-red-400' : 'border-booking-border'}`}>
              <GenderIcon className="h-5 w-5 shrink-0" />
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value as any)}
                className="w-full bg-transparent text-base text-booking-text outline-none cursor-pointer appearance-none"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </span>
            {errors.gender ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.gender}</span> : null}
          </div>

          <AuthInput
            label="Ngày sinh"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            placeholder="Chọn ngày sinh"
            type="date"
            error={errors.dateOfBirth}
            icon={<CalendarIcon className="h-5 w-5 shrink-0" />}
          />

          <AuthInput
            label="Mật khẩu"
            value={password}
            onChange={setPassword}
            placeholder="Tối thiểu 8 ký tự (hoa, thường, số, ký tự đặc biệt)"
            type={showPassword ? 'text' : 'password'}
            error={errors.password}
            icon={<LockIcon className="h-5 w-5 shrink-0" />}
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

          <AuthInput
            label="Xác nhận mật khẩu"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Nhập lại mật khẩu"
            type={showConfirmPassword ? 'text' : 'password'}
            error={errors.confirmPassword}
            icon={<LockIcon className="h-5 w-5 shrink-0" />}
            suffix={
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="text-booking-muted hover:text-booking-text transition-colors flex items-center justify-center shrink-0"
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />

          <button
            type="submit"
            disabled={submitting}
            className="!mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-booking-primary px-5 py-4 font-bold text-white shadow-sm transition hover:bg-booking-primaryDark disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? 'Đang đăng ký...' : 'Đăng ký'}
            <ArrowRightIcon />
          </button>
        </form>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={handleVerifyOtp} noValidate>
          <div className="opacity-60 pointer-events-none">
            <AuthInput
              label="Email xác nhận"
              value={email}
              onChange={() => {}}
              placeholder=""
              icon={<MailIcon className="h-5 w-5 shrink-0" />}
            />
          </div>

          <AuthInput
            label="Mã OTP kích hoạt"
            value={otp}
            onChange={setOtp}
            placeholder="Nhập 6 chữ số OTP từ email"
            error={errors.otp}
            icon={
              <span className="grid h-5 w-5 place-items-center text-xs font-bold text-booking-muted select-none">
                #
              </span>
            }
          />

          <div className="flex items-center justify-between text-sm !mt-6">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={cooldown > 0}
              className={`font-semibold transition ${
                cooldown > 0 ? 'text-booking-muted cursor-not-allowed' : 'text-booking-primary hover:underline'
              }`}
            >
              {cooldown > 0 ? `Gửi lại sau (${cooldown}s)` : 'Gửi lại mã OTP'}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-booking-primary px-5 py-4 font-bold text-white shadow-sm transition hover:bg-booking-primaryDark disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? 'Đang kích hoạt...' : 'Kích hoạt tài khoản'}
            <ArrowRightIcon />
          </button>
        </form>
      )}

      {step === 1 && (
        <>
          <div className="my-8 flex items-center gap-4 text-sm text-booking-muted">
            <span className="h-px flex-1 bg-booking-border" />
            hoặc tiếp tục với
            <span className="h-px flex-1 bg-booking-border" />
          </div>
          <SocialButtons mode="Đăng ký" />
          <p className="mt-6 text-center text-sm text-booking-muted">
            Đã có tài khoản?{' '}
            <Link href="/auth/login" className="font-bold text-booking-primary">
              Đăng nhập
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
