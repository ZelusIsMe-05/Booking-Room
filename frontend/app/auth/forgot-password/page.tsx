'use client';

import { FormEvent, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import AuthInput from '@/components/auth/AuthInput';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '@/components/auth/AuthIcons';
import { ArrowRightIcon } from '@/components/booking/Icons';
import { authService } from '@/services/authService';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Timer for OTP resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const errors = {
    email: submitted && !email.trim() ? 'Vui lòng nhập email.' : '',
    otp: submitted && step === 2 && otp.length !== 6 ? 'Mã OTP gồm 6 chữ số.' : '',
    newPassword: submitted && step === 2 && newPassword.length < 6 ? 'Mật khẩu cần ít nhất 6 ký tự.' : '',
    confirmPassword: submitted && step === 2 && newPassword !== confirmPassword ? 'Mật khẩu xác nhận không trùng khớp.' : '',
  };

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError('');
    setServerSuccess('');

    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const response = await authService.forgotPassword(email.trim());
      setServerSuccess('Yêu cầu đã được xử lý. Vui lòng kiểm tra email của bạn để nhận mã OTP.');
      setCooldown(60); // 60 seconds cooldown
      setStep(2);
      setSubmitted(false);
    } catch (err: any) {
      setServerError(err.message || 'Gửi OTP thất bại. Vui lòng kiểm tra lại email.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError('');
    setServerSuccess('');

    if (otp.length !== 6 || newPassword.length < 6 || newPassword !== confirmPassword) return;

    setSubmitting(true);
    try {
      await authService.resetPassword({
        email: email.trim(),
        otp,
        newPassword,
        confirmPassword,
      });
      setServerSuccess('Đặt lại mật khẩu thành công. Đang chuyển hướng về trang đăng nhập...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setServerError(err.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setServerError('');
    setServerSuccess('');
    
    try {
      await authService.forgotPassword(email.trim());
      setServerSuccess('Mã OTP mới đã được gửi đến email của bạn.');
      setCooldown(60);
    } catch (err: any) {
      setServerError(err.message || 'Gửi lại OTP thất bại.');
    }
  };

  return (
    <AuthShell>
      <div className="mb-4">
        <Link href="/auth/login" className="text-sm font-semibold text-booking-primary hover:underline">
          &larr; Quay lại đăng nhập
        </Link>
      </div>
      <h1 className="text-2xl font-bold">Quên mật khẩu?</h1>
      <p className="mt-4 text-sm leading-6 text-booking-muted">
        {step === 1 
          ? 'Nhập email của bạn để nhận mã OTP xác thực và đặt lại mật khẩu mới.'
          : 'Mã OTP đã được gửi về email của bạn. Vui lòng nhập mã OTP và mật khẩu mới.'}
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
        <form className="mt-5 space-y-4" onSubmit={handleSendOtp} noValidate>
          <AuthInput
            label="Email đăng ký"
            value={email}
            onChange={setEmail}
            placeholder="Nhập email của bạn"
            error={errors.email}
            icon={<MailIcon className="h-5 w-5 shrink-0" />}
          />
          <button
            type="submit"
            disabled={submitting}
            className="!mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-booking-primary px-5 py-4 font-bold text-white shadow-sm transition hover:bg-booking-primaryDark disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? 'Đang xử lý...' : 'Gửi mã OTP'}
            <ArrowRightIcon />
          </button>
        </form>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={handleResetPassword} noValidate>
          <div className="opacity-60 pointer-events-none">
            <AuthInput
              label="Email đăng ký"
              value={email}
              onChange={() => {}}
              placeholder=""
              icon={<MailIcon className="h-5 w-5 shrink-0" />}
            />
          </div>
          
          <AuthInput
            label="Mã OTP"
            value={otp}
            onChange={setOtp}
            placeholder="Nhập 6 chữ số OTP"
            error={errors.otp}
            icon={
              <span className="grid h-5 w-5 place-items-center text-xs font-bold text-booking-muted select-none">
                #
              </span>
            }
          />

          <AuthInput
            label="Mật khẩu mới"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Tối thiểu 6 ký tự"
            type={showNewPassword ? 'text' : 'password'}
            error={errors.newPassword}
            icon={<LockIcon className="h-5 w-5 shrink-0" />}
            suffix={
              <button
                type="button"
                aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onClick={() => setShowNewPassword((value) => !value)}
                className="text-booking-muted hover:text-booking-text transition-colors flex items-center justify-center shrink-0"
              >
                {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />

          <AuthInput
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Nhập lại mật khẩu mới"
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
            {submitting ? 'Đang xử lý...' : 'Xác nhận & Đổi mật khẩu'}
            <ArrowRightIcon />
          </button>
        </form>
      )}
    </AuthShell>
  );
}
