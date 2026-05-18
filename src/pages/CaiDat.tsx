import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FiSettings, FiMail, FiServer, FiKey, FiUser, 
  FiCheckCircle, FiAlertTriangle, FiEye, FiEyeOff, FiInfo, FiSend 
} from 'react-icons/fi';

interface ISMTPConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
}

const CaiDat: React.FC = () => {
  const [smtpConfig, setSMTPConfig] = useState<ISMTPConfig>({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: ''
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [testRecipient, setTestRecipient] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Tải cấu hình SMTP từ DB
  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: ISMTPConfig }>('/settings/smtp');
      if (res.data.success && res.data.data) {
        setSMTPConfig(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'Không thể tải cấu hình SMTP.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Thay đổi input form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSMTPConfig(prev => ({
      ...prev,
      [name]: name === 'smtp_port' ? Number(value) : value
    }));
  };

  // Lưu cấu hình SMTP
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      
      const res = await api.post<{ success: boolean; message: string }>('/settings/smtp', smtpConfig);
      if (res.data.success) {
        setMessage({ text: res.data.message || 'Lưu cấu hình thành công!', type: 'success' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        text: err.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình SMTP.', 
        type: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Gửi email kiểm tra kết nối SMTP
  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient) {
      alert('Vui lòng nhập Email người nhận thử nghiệm');
      return;
    }

    try {
      setTesting(true);
      setMessage(null);

      const payload = {
        ...smtpConfig,
        action: 'test',
        test_recipient: testRecipient
      };

      const res = await api.post<{ success: boolean; message: string }>('/settings/smtp', payload);
      if (res.data.success) {
        setMessage({ text: res.data.message || 'Kết nối thành công!', type: 'success' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        text: err.response?.data?.message || 'Kết nối SMTP thất bại. Vui lòng kiểm tra lại thông tin.', 
        type: 'error' 
      });
    } finally {
      setTesting(false);
    }
  };

  // Tự động điền cấu hình mặc định cho Gmail
  const applyGmailDefaults = () => {
    setSMTPConfig(prev => ({
      ...prev,
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587
    }));
  };

  return (
    <div style={{ padding: '0 0.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Tiêu đề Apple Style */}
      <div className="customer-detail-header" style={{ marginBottom: '1.75rem' }}>
        <h1 className="gradient-title">Cài Đặt Hệ Thống</h1>
        <p>Cấu hình máy chủ SMTP Gmail để tự động gửi thông báo hóa đơn, nhắc nợ và bàn giao tài nguyên cho khách hàng</p>
      </div>

      {/* Thông báo trạng thái */}
      {message && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          padding: '1rem', 
          borderRadius: '12px', 
          marginBottom: '1.5rem',
          backgroundColor: message.type === 'success' ? '#EBF9EB' : '#FFEBEA',
          color: message.type === 'success' ? '#2E7D32' : '#FF3B30',
          border: `1px solid ${message.type === 'success' ? '#C8E6C9' : '#FFCDCC'}`,
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          {message.type === 'success' ? <FiCheckCircle size={18} /> : <FiAlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.75rem' }}>
        
        {/* CỘT 1: FORM CẤU HÌNH SMTP & TEST CONNECTION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Card Cấu hình SMTP */}
          <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <FiServer style={{ color: '#0071E3' }} /> Máy Chủ Gửi Email (SMTP)
              </h2>
              <button 
                type="button" 
                onClick={applyGmailDefaults}
                style={{ 
                  backgroundColor: '#F5F5F7', 
                  color: '#0071E3', 
                  border: '1px solid rgba(0,0,0,0.05)', 
                  padding: '6px 12px', 
                  borderRadius: '14px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                Mặc định Gmail
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                <p>Đang tải cấu hình cài đặt...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveConfig}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  
                  {/* SMTP Host */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="smtp_host" style={{ fontSize: '0.8rem', fontWeight: 600 }}>SMTP Server Host:</label>
                    <input 
                      type="text" 
                      id="smtp_host" 
                      name="smtp_host"
                      value={smtpConfig.smtp_host}
                      onChange={handleInputChange}
                      placeholder="e.g. smtp.gmail.com"
                      required
                      style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                    />
                  </div>

                  {/* SMTP Port */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="smtp_port" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cổng kết nối (Port):</label>
                    <select 
                      id="smtp_port" 
                      name="smtp_port"
                      value={smtpConfig.smtp_port}
                      onChange={handleInputChange}
                      style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                    >
                      <option value={587}>587 (TLS / Khuyên dùng)</option>
                      <option value={465}>465 (SSL)</option>
                    </select>
                  </div>
                </div>

                {/* SMTP Email / Username */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="smtp_user" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiUser size={12} /> Tài khoản Gmail:
                  </label>
                  <input 
                    type="email" 
                    id="smtp_user" 
                    name="smtp_user"
                    value={smtpConfig.smtp_user}
                    onChange={handleInputChange}
                    placeholder="e.g. cuahangmmo@gmail.com"
                    required
                    style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                  />
                </div>

                {/* SMTP Password */}
                <div className="form-group" style={{ marginBottom: '1rem', position: 'relative' }}>
                  <label htmlFor="smtp_pass" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiKey size={12} /> Mật khẩu ứng dụng (App Password):
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      id="smtp_pass" 
                      name="smtp_pass"
                      value={smtpConfig.smtp_pass}
                      onChange={handleInputChange}
                      placeholder="Nhập 16 ký tự mật khẩu ứng dụng Gmail"
                      required
                      style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 3.2rem 0 10px', width: '100%', outline: 'none' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>

                {/* SMTP From */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="smtp_from" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiMail size={12} /> Tên Người Gửi hiển thị:
                  </label>
                  <input 
                    type="text" 
                    id="smtp_from" 
                    name="smtp_from"
                    value={smtpConfig.smtp_from}
                    onChange={handleInputChange}
                    placeholder='e.g. "Cửa Hàng MMO" <cuahangmmo@gmail.com>'
                    style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                  />
                  <small style={{ color: 'var(--text-light)', marginTop: '4px', display: 'block', fontSize: '0.75rem' }}>
                    * Để trống sẽ mặc định dùng địa chỉ Gmail của bạn làm tên hiển thị.
                  </small>
                </div>

                <button 
                  type="submit" 
                  className="btn-save"
                  disabled={saving}
                  style={{ width: '100%', height: '44px', fontWeight: 600, borderRadius: '12px' }}
                >
                  {saving ? 'Đang lưu cấu hình...' : 'Lưu Cấu Hình SMTP'}
                </button>
              </form>
            )}
          </div>

          {/* Card Test Connection */}
          {!loading && (
            <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
              <h2 style={{ fontSize: '1.1rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '0.75rem' }}>
                <FiSend style={{ color: '#34C759' }} /> Kiểm Tra Gửi Thử (SMTP Test)
              </h2>
              
              <form onSubmit={handleTestConnection}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input 
                    type="email" 
                    placeholder="Nhập email nhận thử (e.g. gmail của bạn)..." 
                    value={testRecipient}
                    onChange={e => setTestRecipient(e.target.value)}
                    required
                    style={{ flex: 1, height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 12px', outline: 'none' }}
                  />
                  <button 
                    type="submit" 
                    disabled={testing}
                    style={{ 
                      backgroundColor: '#34C759', 
                      color: '#FFF', 
                      border: 'none', 
                      padding: '0 20px', 
                      borderRadius: '8px', 
                      fontWeight: 600, 
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FiSend /> {testing ? 'Đang gửi test...' : 'Gửi Thử'}
                  </button>
                </div>
                <small style={{ color: 'var(--text-light)', marginTop: '6px', display: 'block', fontSize: '0.75rem' }}>
                  * Hệ thống sẽ gửi một email HTML Apple Style đẹp mắt đến địa chỉ này để thử nghiệm SMTP ngay lập tức.
                </small>
              </form>
            </div>
          )}

        </div>

        {/* CỘT 2: HƯỚNG DẪN CẤU HÌNH GMAIL (APPLE GLASS CARD) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div 
            className="table-card widget" 
            style={{ 
              padding: '1.75rem', 
              borderRadius: '20px', 
              backgroundColor: '#FFFDF0', 
              border: '1px solid #FFEBB3',
              boxShadow: '0 4px 20px rgba(255, 149, 0, 0.04)' 
            }}
          >
            <h2 style={{ fontSize: '1.1rem', color: '#D27B00', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #FFEBB3', paddingBottom: '0.75rem', marginTop: 0 }}>
              <FiInfo /> Hướng Dẫn Cấu Hình Gmail
            </h2>

            <div style={{ fontSize: '0.875rem', color: '#515154', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0 }}>
                Để sử dụng tài khoản Gmail gửi thư thông báo nhắc nợ hóa đơn, Google yêu cầu bạn sử dụng <strong>Mật khẩu ứng dụng (App Password)</strong> thay vì mật khẩu đăng nhập thông thường để đảm bảo bảo mật.
              </p>

              <div>
                <strong style={{ color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>Bước 1: Bật Xác minh 2 bước</strong>
                <span>Truy cập Tài khoản Google của bạn &gt; chọn tab <strong>Bảo mật (Security)</strong> &gt; Đảm bảo mục <strong>Xác minh 2 bước (2-Step Verification)</strong> đang được BẬT.</span>
              </div>

              <div>
                <strong style={{ color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>Bước 2: Tạo Mật khẩu ứng dụng</strong>
                <span>Tại thanh tìm kiếm tài khoản Google của bạn, gõ chữ <strong>"Mật khẩu ứng dụng" (App Passwords)</strong> hoặc truy cập trực tiếp mục Bảo mật &gt; Mật khẩu ứng dụng.</span>
              </div>

              <div>
                <strong style={{ color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>Bước 3: Lấy khóa 16 ký tự</strong>
                <span>Chọn ứng dụng là <em>Thư (Mail)</em> và thiết bị là <em>Máy tính Windows/Mac</em>, bấm <strong>Tạo (Generate)</strong>. Bạn sẽ nhận được mã mật khẩu gồm **16 ký tự màu vàng**. Hãy sao chép mã này và dán vào ô **App Password** bên cạnh.</span>
              </div>

              <div style={{ backgroundColor: '#FFF9E6', padding: '10px 14px', borderRadius: '10px', borderLeft: '3px solid #FF9500', marginTop: '4px', fontSize: '0.8rem' }}>
                <strong>Lưu ý:</strong> Mật khẩu ứng dụng Gmail là chuỗi ký tự viết liền không dấu cách (e.g. <code>abcd efgh ijkl mnop</code>). Hãy dán trực tiếp mã này vào ô cấu hình.
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default CaiDat;
