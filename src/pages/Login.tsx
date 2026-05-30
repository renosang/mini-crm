import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import logo from '../assets/logo.png';

// ===== Icons as inline SVGs for zero dependency =====
const EyeIcon = ({ visible }: { visible: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {visible ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const SpinnerIcon = () => (
  <svg className="spin-animation" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" opacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" stroke="#34C759" fill="#F0F9F1" />
    <path d="M8 12l2 2 4-4" stroke="#34C759" strokeWidth="2.5" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

// ===== Main Login Component =====
const Login: React.FC = () => {
  // --- Login state ---
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);

  // --- Forgot Password state ---
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [fpUsername, setFpUsername] = useState<string>('');
  const [fpEmail, setFpEmail] = useState<string>('');
  const [needEmailInput, setNeedEmailInput] = useState<boolean>(false);
  const [fpResetCode, setFpResetCode] = useState<string>('');
  const [fpNewPassword, setFpNewPassword] = useState<string>('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState<string>('');
  const [fpStep, setFpStep] = useState<number>(1); // 1 = request code, 2 = reset password, 3 = success
  const [fpError, setFpError] = useState<string>('');
  const [fpSuccess, setFpSuccess] = useState<string>('');
  const [fpLoading, setFpLoading] = useState<boolean>(false);
  const [fpShowNewPwd, setFpShowNewPwd] = useState<boolean>(false);
  const [fpShowConfirmPwd, setFpShowConfirmPwd] = useState<boolean>(false);

  // Auto focus username input on mount
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  // Load saved username from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('remembered_username');
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

  // ===== Login Handler =====
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(username.trim(), password);

      if (success) {
        // Save / clear remembered username
        if (rememberMe) {
          localStorage.setItem('remembered_username', username.trim());
        } else {
          localStorage.removeItem('remembered_username');
        }
        navigate('/');
      } else {
        setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } catch (err) {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Forgot Password Handlers =====
  const openForgotModal = () => {
    setShowForgotModal(true);
    setFpStep(1);
    setFpError('');
    setFpSuccess('');
    setFpUsername(username);
    setFpEmail('');
    setNeedEmailInput(false);
    setFpResetCode('');
    setFpNewPassword('');
    setFpConfirmPassword('');
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setFpError('');
    setFpSuccess('');
    setFpEmail('');
    setNeedEmailInput(false);
  };

  // Step 1: Request reset code
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    setFpSuccess('');

    if (!fpUsername.trim()) {
      setFpError('Vui lòng nhập tên đăng nhập.');
      return;
    }

    if (needEmailInput && !fpEmail.trim()) {
      setFpError('Vui lòng nhập email để nhận mã.');
      return;
    }

    setFpLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        username: fpUsername.trim(),
        email: fpEmail.trim(),
      });

      if (data.success === false && data.needEmail) {
        setNeedEmailInput(true);
        setFpError(data.message);
        setFpLoading(false);
        return;
      }

      setFpSuccess(data.message);
      // Auto advance to step 2 after a moment
      setTimeout(() => {
        setFpStep(2);
        setFpLoading(false);
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tạo mã xác nhận. Vui lòng thử lại.';
      setFpError(msg);
      setFpLoading(false);
    }
  };

  // Step 2: Reset password with code
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    setFpSuccess('');

    if (!fpResetCode.trim()) {
      setFpError('Vui lòng nhập mã xác nhận.');
      return;
    }
    if (!fpNewPassword || fpNewPassword.length < 6) {
      setFpError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      setFpError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setFpLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        username: fpUsername.trim(),
        resetCode: fpResetCode.trim(),
        newPassword: fpNewPassword,
      });
      setFpSuccess(data.message);
      setFpStep(3);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn.';
      setFpError(msg);
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo Section */}
        <div className="login-logo-section">
          <img src={logo} alt="Beegadget Logo" className="login-logo-img" />
          <p className="login-subtitle">Đăng nhập để quản lý hệ thống</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form-elegant" noValidate>
          {/* Error Message */}
          {error && (
            <div className="login-error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          {/* Username Field */}
          <div className="login-field">
            <div className="login-input-wrapper">
              <input
                ref={usernameRef}
                type="text"
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tên đăng nhập"
                autoComplete="username"
                disabled={isLoading}
              />
              <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
          </div>

          {/* Password Field */}
          <div className="login-field">
            <div className="login-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <button
                type="button"
                className="login-pwd-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          {/* Remember me & Forgot password row */}
          <div className="login-options-row">
            <label className="login-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span className="login-checkbox-custom" />
              <span>Ghi nhớ tài khoản</span>
            </label>
            <button
              type="button"
              className="login-forgot-btn"
              onClick={openForgotModal}
              disabled={isLoading}
            >
              Quên mật khẩu?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`login-submit-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <SpinnerIcon />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>

          {/* Keyboard hint */}
          <p className="login-keyboard-hint">
            Nhấn <kbd>Enter</kbd> để đăng nhập
          </p>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p>Beegadget.net &copy; {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* ===== Forgot Password Modal ===== */}
      {showForgotModal && (
        <div className="login-modal-overlay" onClick={closeForgotModal}>
          <div
            className="login-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="login-modal-close" onClick={closeForgotModal}>
              &times;
            </button>

            {fpStep === 1 && (
              <div className="fp-step">
                <div className="fp-icon-circle">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h2>Quên mật khẩu</h2>
                <p className="fp-desc">
                  Nhập tên đăng nhập để nhận mã xác nhận đặt lại mật khẩu.
                </p>

                {fpError && <div className="fp-error">{fpError}</div>}
                {fpSuccess && <div className="fp-success">{fpSuccess}</div>}

                <form onSubmit={handleRequestReset} className="fp-form">
                  <div className="login-field">
                    <label htmlFor="fp-username" className="login-label">Tên đăng nhập</label>
                    <div className="login-input-wrapper">
                      <input
                        type="text"
                        id="fp-username"
                        value={fpUsername}
                        onChange={(e) => setFpUsername(e.target.value)}
                        placeholder="Nhập tên đăng nhập..."
                        disabled={fpLoading || needEmailInput}
                      />
                      <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  </div>

                  {needEmailInput && (
                    <div className="login-field animate-fadeIn" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                      <label htmlFor="fp-email" className="login-label">Email của bạn</label>
                      <div className="login-input-wrapper">
                        <input
                          type="email"
                          id="fp-email"
                          value={fpEmail}
                          onChange={(e) => setFpEmail(e.target.value)}
                          placeholder="Nhập email để nhận mã..."
                          disabled={fpLoading}
                          required
                        />
                        <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="login-submit-btn"
                    disabled={fpLoading}
                  >
                    {fpLoading ? (
                      <>
                        <SpinnerIcon />
                        Đang xử lý...
                      </>
                    ) : (
                      needEmailInput ? 'Gửi mã xác nhận' : 'Lấy mã xác nhận'
                    )}
                  </button>
                </form>
              </div>
            )}

            {fpStep === 2 && (
              <div className="fp-step">
                <div className="fp-icon-circle fp-icon-warning">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h2>Đặt lại mật khẩu</h2>
                <p className="fp-desc">
                  Nhập mã xác nhận đã được hiển thị và mật khẩu mới của bạn.
                </p>

                {fpError && <div className="fp-error">{fpError}</div>}
                {fpSuccess && <div className="fp-success">{fpSuccess}</div>}

                <form onSubmit={handleResetPassword} className="fp-form">
                  {/* Reset Code */}
                  <div className="login-field">
                    <label htmlFor="fp-reset-code" className="login-label">Mã xác nhận</label>
                    <div className="login-input-wrapper">
                      <input
                        type="text"
                        id="fp-reset-code"
                        value={fpResetCode}
                        onChange={(e) => setFpResetCode(e.target.value)}
                        placeholder="Nhập mã xác nhận..."
                        disabled={fpLoading}
                        autoComplete="off"
                      />
                      <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 7 4 4 20 4 20 7" />
                        <line x1="9" y1="20" x2="15" y2="20" />
                        <line x1="12" y1="4" x2="12" y2="20" />
                      </svg>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="login-field">
                    <label htmlFor="fp-new-password" className="login-label">Mật khẩu mới</label>
                    <div className="login-input-wrapper">
                      <input
                        type={fpShowNewPwd ? 'text' : 'password'}
                        id="fp-new-password"
                        value={fpNewPassword}
                        onChange={(e) => setFpNewPassword(e.target.value)}
                        placeholder="Nhập mật khẩu mới..."
                        disabled={fpLoading}
                        autoComplete="new-password"
                      />
                      <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <button
                        type="button"
                        className="login-pwd-toggle"
                        onClick={() => setFpShowNewPwd(!fpShowNewPwd)}
                        tabIndex={-1}
                      >
                        <EyeIcon visible={fpShowNewPwd} />
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="login-field">
                    <label htmlFor="fp-confirm-password" className="login-label">Xác nhận mật khẩu</label>
                    <div className="login-input-wrapper">
                      <input
                        type={fpShowConfirmPwd ? 'text' : 'password'}
                        id="fp-confirm-password"
                        value={fpConfirmPassword}
                        onChange={(e) => setFpConfirmPassword(e.target.value)}
                        placeholder="Xác nhận mật khẩu mới..."
                        disabled={fpLoading}
                        autoComplete="new-password"
                      />
                      <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <button
                        type="button"
                        className="login-pwd-toggle"
                        onClick={() => setFpShowConfirmPwd(!fpShowConfirmPwd)}
                        tabIndex={-1}
                      >
                        <EyeIcon visible={fpShowConfirmPwd} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-submit-btn"
                    disabled={fpLoading}
                  >
                    {fpLoading ? (
                      <>
                        <SpinnerIcon />
                        Đang xử lý...
                      </>
                    ) : (
                      'Đặt lại mật khẩu'
                    )}
                  </button>
                </form>

                <button
                  className="fp-back-btn"
                  onClick={() => { setFpStep(1); setFpError(''); setFpSuccess(''); }}
                >
                  <ArrowLeftIcon /> Quay lại
                </button>
              </div>
            )}

            {fpStep === 3 && (
              <div className="fp-step fp-step-success">
                <CheckCircleIcon />
                <h2>Đặt lại mật khẩu thành công!</h2>
                <p className="fp-desc">
                  Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại với mật khẩu mới.
                </p>
                <button
                  className="login-submit-btn"
                  onClick={() => {
                    setShowForgotModal(false);
                    setPassword('');
                  }}
                >
                  Đăng nhập ngay
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
