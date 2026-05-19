import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import { 
  FiSettings, FiMail, FiServer, FiKey, FiUser, 
  FiCheckCircle, FiAlertTriangle, FiEye, FiEyeOff, FiInfo, FiSend,
  FiCreditCard, FiSearch, FiChevronDown, FiCheck
} from 'react-icons/fi';

interface ISMTPConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
}

interface IBankConfig {
  bank_id: string;
  account_no: string;
  account_name: string;
  bank_name: string;
  bank_logo: string;
}

interface IVietQRBank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
}

function removeVietnameseTones(str: string): string {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  str = str.replace(/\u0300|\u0301|\u0309|\u0303|\u0323/g, "");
  str = str.replace(/\u02C6|\u0306|\u031B/g, "");
  return str;
}

const CaiDat: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'smtp';

  // --- SMTP STATE ---
  const [smtpConfig, setSMTPConfig] = useState<ISMTPConfig>({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: ''
  });
  const [testing, setTesting] = useState<boolean>(false);
  const [testRecipient, setTestRecipient] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // --- BANK STATE ---
  const [bankConfig, setBankConfig] = useState<IBankConfig>({
    bank_id: 'Sacombank',
    account_no: '060233251669',
    account_name: 'Nguyễn Thanh Sang',
    bank_name: 'Sacombank',
    bank_logo: 'https://api.vietqr.io/img/STB.png'
  });
  const [banksList, setBanksList] = useState<IVietQRBank[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savingBank, setSavingBank] = useState<boolean>(false);

  // --- COMMON STATE ---
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Tải danh sách ngân hàng từ VietQR API
  const fetchBanks = async () => {
    try {
      const res = await axios.get('https://api.vietqr.io/v2/banks');
      if (res.data && res.data.data) {
        setBanksList(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách ngân hàng:', err);
      // Fallback danh sách các ngân hàng lớn
      setBanksList([
        { id: 1, name: 'Ngân hàng TMCP Sài Gòn Thương Tín', code: 'Sacombank', bin: '970403', shortName: 'Sacombank', logo: 'https://api.vietqr.io/img/STB.png' },
        { id: 2, name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', code: 'VCB', bin: '970436', shortName: 'Vietcombank', logo: 'https://api.vietqr.io/img/VCB.png' },
        { id: 3, name: 'Ngân hàng TMCP Kỹ Thương Việt Nam', code: 'TCB', bin: '970407', shortName: 'Techcombank', logo: 'https://api.vietqr.io/img/TCB.png' },
        { id: 4, name: 'Ngân hàng TMCP Quân Đội', code: 'MB', bin: '970422', shortName: 'MBBank', logo: 'https://api.vietqr.io/img/MB.png' },
        { id: 5, name: 'Ngân hàng TMCP Công Thương Việt Nam', code: 'CTG', bin: '970415', shortName: 'VietinBank', logo: 'https://api.vietqr.io/img/CTG.png' },
        { id: 6, name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', code: 'BIDV', bin: '970418', shortName: 'BIDV', logo: 'https://api.vietqr.io/img/BIDV.png' },
        { id: 7, name: 'Ngân hàng TMCP Á Châu', code: 'ACB', bin: '970416', shortName: 'ACB', logo: 'https://api.vietqr.io/img/ACB.png' },
        { id: 8, name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', code: 'VPB', bin: '970432', shortName: 'VPBank', logo: 'https://api.vietqr.io/img/VPB.png' },
        { id: 9, name: 'Ngân hàng TMCP Quốc tế Việt Nam', code: 'VIB', bin: '970441', shortName: 'VIB', logo: 'https://api.vietqr.io/img/VIB.png' },
        { id: 10, name: 'Ngân hàng TMCP Tiên Phong', code: 'TPB', bin: '970423', shortName: 'TPBank', logo: 'https://api.vietqr.io/img/TPB.png' }
      ]);
    }
  };

  // Tải cấu hình SMTP từ DB
  const loadConfig = async () => {
    try {
      const res = await api.get<{ success: boolean; data: ISMTPConfig }>('/settings/smtp');
      if (res.data.success && res.data.data) {
        setSMTPConfig(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'Không thể tải cấu hình SMTP.', type: 'error' });
    }
  };

  // Tải cấu hình tài khoản chuyển tiền từ DB
  const loadBankConfig = async () => {
    try {
      const res = await api.get<{ success: boolean; data: IBankConfig }>('/settings/bank');
      if (res.data.success && res.data.data) {
        setBankConfig(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'Không thể tải cấu hình tài khoản chuyển khoản.', type: 'error' });
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadConfig(), loadBankConfig(), fetchBanks()]);
      setLoading(false);
    };
    init();
  }, []);

  // Thay đổi input form SMTP
  const handleSMTPInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSMTPConfig(prev => ({
      ...prev,
      [name]: name === 'smtp_port' ? Number(value) : value
    }));
  };

  // Lưu cấu hình SMTP
  const handleSaveSMTPConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await api.post<{ success: boolean; message: string }>('/settings/smtp', smtpConfig);
      if (res.data.success) {
        setMessage({ text: res.data.message || 'Lưu cấu hình SMTP thành công!', type: 'success' });
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
        setMessage({ text: res.data.message || 'Kết nối SMTP thành công!', type: 'success' });
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

  // --- BANK HANDLERS ---
  const handleBankInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBankConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveBankConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingBank(true);
      setMessage(null);
      const res = await api.post<{ success: boolean; message: string }>('/settings/bank', bankConfig);
      if (res.data.success) {
        setMessage({ text: res.data.message || 'Lưu cấu hình chuyển khoản thành công!', type: 'success' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        text: err.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình chuyển khoản.', 
        type: 'error' 
      });
    } finally {
      setSavingBank(false);
    }
  };

  // Lọc danh sách ngân hàng dựa trên từ khóa tìm kiếm
  const filteredBanks = banksList.filter(bank => 
    bank.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bank.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tạo URL ảnh QR Code live preview
  const cleanBankId = bankConfig.bank_id.replace(/\s+/g, '');
  const cleanAccountNo = bankConfig.account_no.replace(/\s+/g, '');
  const cleanAccountName = encodeURIComponent(removeVietnameseTones(bankConfig.account_name).toUpperCase());
  
  const liveQrUrl = cleanBankId && cleanAccountNo
    ? `https://img.vietqr.io/image/${cleanBankId}-${cleanAccountNo}-compact2.png?amount=50000&addInfo=DEMO%20THANH%20TOAN&accountName=${cleanAccountName}`
    : '';

  return (
    <div style={{ padding: '0 0.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Tiêu đề Apple Style */}
      <div className="customer-detail-header" style={{ marginBottom: '1.25rem' }}>
        <h1 className="gradient-title">Cài Đặt Hệ Thống</h1>
        <p>
          {activeTab === 'smtp' 
            ? 'Cấu hình máy chủ SMTP Gmail để tự động gửi thông báo hóa đơn, nhắc nợ và bàn giao tài nguyên cho khách hàng'
            : 'Cấu hình tài khoản ngân hàng nhận tiền thụ hưởng. Hệ thống sẽ tự tạo mã VietQR khớp số tiền và cú pháp trên hóa đơn PDF'}
        </p>
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.75rem', borderBottom: '1px solid #E5E5EA', paddingBottom: '0.6rem' }}>
        <button 
          onClick={() => setSearchParams({ tab: 'smtp' })}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeTab === 'smtp' ? 'var(--primary-color)' : 'none',
            color: activeTab === 'smtp' ? 'white' : 'var(--text-light)',
            fontWeight: 600,
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: activeTab === 'smtp' ? '0 4px 12px rgba(0, 113, 227, 0.2)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <FiServer /> Cấu Hình SMTP Email
        </button>
        <button 
          onClick={() => setSearchParams({ tab: 'bank' })}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeTab === 'bank' ? 'var(--primary-color)' : 'none',
            color: activeTab === 'bank' ? 'white' : 'var(--text-light)',
            fontWeight: 600,
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: activeTab === 'bank' ? '0 4px 12px rgba(0, 113, 227, 0.2)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <FiCreditCard /> Cài Đặt Chuyển Khoản (VietQR)
        </button>
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

      {loading ? (
        <div className="widget" style={{ textAlign: 'center', padding: '5rem', backgroundColor: '#FFF', borderRadius: '20px' }}>
          <p style={{ color: 'var(--text-light)', fontSize: '1rem' }}>Đang tải cấu hình cài đặt...</p>
        </div>
      ) : (
        <div>
          {/* TAB 1: CẤU HÌNH SMTP */}
          {activeTab === 'smtp' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
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

                  <form onSubmit={handleSaveSMTPConfig}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="smtp_host" style={{ fontSize: '0.8rem', fontWeight: 600 }}>SMTP Server Host:</label>
                        <input 
                          type="text" 
                          id="smtp_host" 
                          name="smtp_host"
                          value={smtpConfig.smtp_host}
                          onChange={handleSMTPInputChange}
                          placeholder="e.g. smtp.gmail.com"
                          required
                          style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="smtp_port" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cổng kết nối (Port):</label>
                        <select 
                          id="smtp_port" 
                          name="smtp_port"
                          value={smtpConfig.smtp_port}
                          onChange={handleSMTPInputChange}
                          style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                        >
                          <option value={587}>587 (TLS / Khuyên dùng)</option>
                          <option value={465}>465 (SSL)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label htmlFor="smtp_user" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiUser size={12} /> Tài khoản Gmail:
                      </label>
                      <input 
                        type="email" 
                        id="smtp_user" 
                        name="smtp_user"
                        value={smtpConfig.smtp_user}
                        onChange={handleSMTPInputChange}
                        placeholder="e.g. cuahangmmo@gmail.com"
                        required
                        style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                      />
                    </div>

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
                          onChange={handleSMTPInputChange}
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

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label htmlFor="smtp_from" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiMail size={12} /> Tên Người Gửi hiển thị:
                      </label>
                      <input 
                        type="text" 
                        id="smtp_from" 
                        name="smtp_from"
                        value={smtpConfig.smtp_from}
                        onChange={handleSMTPInputChange}
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
                </div>

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
                        <FiSend /> {testing ? 'Đang gửi...' : 'Gửi Thử'}
                      </button>
                    </div>
                    <small style={{ color: 'var(--text-light)', marginTop: '6px', display: 'block', fontSize: '0.75rem' }}>
                      * Hệ thống sẽ gửi một email HTML đẹp mắt đến địa chỉ này để thử nghiệm SMTP ngay lập tức.
                    </small>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFFDF0', border: '1px solid #FFEBB3' }}>
                  <h2 style={{ fontSize: '1.1rem', color: '#D27B00', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #FFEBB3', paddingBottom: '0.75rem', marginTop: 0 }}>
                    <FiInfo /> Hướng Dẫn Cấu Hình Gmail
                  </h2>
                  <div style={{ fontSize: '0.875rem', color: '#515154', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ margin: 0 }}>
                      Để sử dụng tài khoản Gmail gửi thư tự động, bạn cần tạo <strong>Mật khẩu ứng dụng (App Password)</strong> thay vì mật khẩu thông thường.
                    </p>
                    <div>
                      <strong style={{ color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>Bước 1: Bật Xác minh 2 bước</strong>
                      <span>Truy cập Tài khoản Google của bạn &gt; tab <strong>Bảo mật (Security)</strong> &gt; Đảm bảo mục <strong>Xác minh 2 bước (2-Step Verification)</strong> đang được BẬT.</span>
                    </div>
                    <div>
                      <strong style={{ color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>Bước 2: Tạo Mật khẩu ứng dụng</strong>
                      <span>Tại thanh tìm kiếm tài khoản Google, gõ chữ <strong>"Mật khẩu ứng dụng" (App Passwords)</strong> hoặc truy cập tab Bảo mật &gt; Mật khẩu ứng dụng.</span>
                    </div>
                    <div>
                      <strong style={{ color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>Bước 3: Lấy khóa 16 ký tự</strong>
                      <span>Chọn ứng dụng là <em>Thư</em> và thiết bị là <em>Máy tính</em>, bấm <strong>Tạo</strong>. Bạn sẽ nhận được mã mật khẩu gồm **16 ký tự màu vàng**. Hãy dán mã này vào ô **App Password** bên cạnh.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CÀI ĐẶT CHUYỂN KHOẢN (VIETQR) */}
          {activeTab === 'bank' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.75rem' }}>
              
              {/* Form Cấu hình */}
              <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '0.75rem' }}>
                  <FiCreditCard style={{ color: '#0071E3' }} /> Tài Khoản Nhận Chuyển Khoản
                </h2>

                <form onSubmit={handleSaveBankConfig}>
                  
                  {/* Select Bank (Custom Searchable Dropdown với Logo) */}
                  <div className="form-group" style={{ marginBottom: '1.25rem', position: 'relative' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Chọn ngân hàng:</label>
                    
                    {/* Toggler Button */}
                    <div 
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      style={{
                        height: '46px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        padding: '0 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: '#FFF',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {bankConfig.bank_logo ? (
                          <img src={bankConfig.bank_logo} alt={bankConfig.bank_id} style={{ height: '22px', maxWidth: '75px', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#E5E5EA', display: 'flex', alignItems: 'center', justifyItems: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-light)' }}>B</div>
                        )}
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {bankConfig.bank_name} ({bankConfig.bank_id})
                        </span>
                      </div>
                      <FiChevronDown style={{ color: 'var(--text-light)', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>

                    {/* Dropdown List */}
                    {dropdownOpen && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 200,
                          backgroundColor: '#FFF',
                          border: '1px solid #D2D2D7',
                          borderRadius: '10px',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                          marginTop: '4px',
                          maxHeight: '280px',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {/* Search Input inside Dropdown */}
                        <div style={{ padding: '8px', borderBottom: '1px solid #E5E5EA', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F5F5F7', borderRadius: '10px 10px 0 0' }}>
                          <FiSearch style={{ color: 'var(--text-light)' }} />
                          <input 
                            type="text" 
                            placeholder="Tìm kiếm ngân hàng..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                              border: 'none',
                              outline: 'none',
                              background: 'none',
                              fontSize: '0.85rem',
                              width: '100%',
                              padding: '4px 0'
                            }}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>

                        {/* Banks Scroll Area */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
                          
                          {/* Option Khác / Tự nhập */}
                          <div 
                            onClick={() => {
                              setBankConfig(prev => ({
                                ...prev,
                                bank_id: 'Custom',
                                bank_name: 'Ngân hàng khác',
                                bank_logo: ''
                              }));
                              setDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: bankConfig.bank_id === 'Custom' ? '#F2F8FF' : 'transparent',
                              transition: 'background-color 0.15s'
                            }}
                            className="bank-item"
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-color)' }}>➕ Ngân hàng khác (Tự nhập tay)</span>
                            {bankConfig.bank_id === 'Custom' && <FiCheck style={{ color: 'var(--primary-color)' }} />}
                          </div>

                          <hr style={{ border: 'none', borderTop: '1px solid #E5E5EA', margin: '4px 0' }} />

                          {filteredBanks.length > 0 ? (
                            filteredBanks.map(bank => {
                              const isSelected = bankConfig.bank_id === bank.code;
                              return (
                                <div 
                                  key={bank.id}
                                  onClick={() => {
                                    setBankConfig(prev => ({
                                      ...prev,
                                      bank_id: bank.code,
                                      bank_name: bank.shortName,
                                      bank_logo: bank.logo
                                    }));
                                    setDropdownOpen(false);
                                    setSearchQuery('');
                                  }}
                                  style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: isSelected ? '#F2F8FF' : 'transparent',
                                    transition: 'background-color 0.15s'
                                  }}
                                  className="bank-item"
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img src={bank.logo} alt={bank.code} style={{ height: '20px', width: '60px', objectFit: 'contain', backgroundColor: '#FFF', padding: '2px', borderRadius: '4px' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1D1D1F' }}>{bank.shortName}</span>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{bank.name}</span>
                                    </div>
                                  </div>
                                  {isSelected && <FiCheck style={{ color: 'var(--primary-color)' }} />}
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                              Không tìm thấy ngân hàng khớp từ khóa.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Backdrop to close dropdown */}
                  {dropdownOpen && (
                    <div 
                      onClick={() => setDropdownOpen(false)} 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 150, background: 'none' }}
                    />
                  )}

                  {/* Nếu chọn Tự Nhập -> Hiện 2 ô nhập tùy biến */}
                  {bankConfig.bank_id === 'Custom' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1.25rem', backgroundColor: '#F5F5F7', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tên ngân hàng đầy đủ:</label>
                        <input 
                          type="text" 
                          name="bank_name"
                          value={bankConfig.bank_name === 'Ngân hàng khác' ? '' : bankConfig.bank_name}
                          onChange={handleBankInputChange}
                          placeholder="e.g. Sacombank"
                          required
                          style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Mã ngân hàng (VietQR):</label>
                        <input 
                          type="text" 
                          name="bank_id"
                          value={bankConfig.bank_id === 'Custom' ? '' : bankConfig.bank_id}
                          onChange={handleBankInputChange}
                          placeholder="e.g. Sacombank, VCB, MB"
                          required
                          style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Số Tài Khoản */}
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label htmlFor="account_no" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Số tài khoản nhận tiền:</label>
                    <input 
                      type="text" 
                      id="account_no" 
                      name="account_no"
                      value={bankConfig.account_no}
                      onChange={handleBankInputChange}
                      placeholder="Nhập số tài khoản ngân hàng của bạn"
                      required
                      style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                    />
                  </div>

                  {/* Tên Chủ Tài Khoản */}
                  <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                    <label htmlFor="account_name" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tên chủ tài khoản (Viết hoa không dấu):</label>
                    <input 
                      type="text" 
                      id="account_name" 
                      name="account_name"
                      value={bankConfig.account_name}
                      onChange={e => {
                        const val = e.target.value;
                        setBankConfig(prev => ({
                          ...prev,
                          account_name: val
                        }));
                      }}
                      placeholder="e.g. NGUYEN THANH SANG"
                      required
                      style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                    />
                    <small style={{ color: 'var(--text-light)', marginTop: '4px', display: 'block', fontSize: '0.75rem' }}>
                      * Hãy nhập tên viết hoa không dấu để mã QR quét thông tin chính xác nhất trên tất cả các app ngân hàng.
                    </small>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-save"
                    disabled={savingBank}
                    style={{ width: '100%', height: '44px', fontWeight: 600, borderRadius: '12px' }}
                  >
                    {savingBank ? 'Đang lưu cấu hình...' : 'Lưu Thông Tin Chuyển Khoản'}
                  </button>
                </form>
              </div>

              {/* Live Preview Panel (Right Column) */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div 
                  className="table-card widget" 
                  style={{ 
                    padding: '1.5rem', 
                    borderRadius: '20px', 
                    backgroundColor: '#FFFDF0', 
                    border: '1px solid #FFEBB3',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: '0 10px 30px rgba(255, 183, 0, 0.05)'
                  }}
                >
                  <h3 style={{ fontSize: '1rem', color: '#D27B00', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 1rem 0', width: '100%', borderBottom: '1px solid #FFEBB3', paddingBottom: '0.5rem' }}>
                    <FiInfo /> Live Preview: QR Thanh Toán
                  </h3>
                  
                  {liveQrUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      
                      {/* Thẻ mô phỏng hóa đơn */}
                      <div 
                        style={{
                          backgroundColor: '#FFF',
                          border: '1px solid #E5E5EA',
                          borderRadius: '14px',
                          padding: '1.25rem',
                          width: '100%',
                          maxWidth: '280px',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}
                      >
                        {/* Logo ngân hàng */}
                        {bankConfig.bank_logo && (
                          <img src={bankConfig.bank_logo} alt="Bank Logo" style={{ height: '24px', maxWidth: '90px', objectFit: 'contain', marginBottom: '8px' }} />
                        )}
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1D1D1F', marginBottom: '12px' }}>{bankConfig.bank_name}</span>

                        {/* VietQR Code Frame */}
                        <div style={{ padding: '6px', border: '1px solid #E5E5EA', borderRadius: '8px', backgroundColor: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img 
                            src={liveQrUrl} 
                            alt="VietQR Live Preview" 
                            style={{ width: '160px', height: '160px', objectFit: 'contain' }}
                            onError={(e) => {
                              // Fallback if image fails to load
                              (e.target as HTMLImageElement).src = 'https://placehold.co/160x160/F5F5F7/86868B?text=VietQR+Preview';
                            }}
                          />
                        </div>

                        {/* Thông tin Text bên dưới */}
                        <div style={{ width: '100%', marginTop: '12px', borderTop: '1px dashed #E5E5EA', paddingTop: '10px', fontSize: '0.75rem', color: '#515154' }}>
                          <div style={{ marginBottom: '4px' }}>Số tiền demo: <strong style={{ color: '#D27B00' }}>50,000 đ</strong></div>
                          <div style={{ marginBottom: '4px' }}>Chủ TK: <strong>{bankConfig.account_name.toUpperCase()}</strong></div>
                          <div>Số TK: <strong>{bankConfig.account_no}</strong></div>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.75rem', color: '#86868B', textAlign: 'center', marginTop: '12px', lineHeight: '1.4', margin: '12px 0 0 0' }}>
                        * Đây là mã QR mô phỏng thử nghiệm thực tế. Khi gửi hóa đơn cho khách hàng, hệ thống sẽ tự động chèn số tiền đơn hàng và mã hóa đơn vào nội dung chuyển khoản.
                      </p>
                    </div>
                  ) : (
                    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                      Vui lòng nhập Số tài khoản và tên Chủ tài khoản để tạo mã QR Code xem trước.
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default CaiDat;
