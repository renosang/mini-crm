import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import {
  FiSettings, FiMail, FiServer, FiKey, FiUser,
  FiCheckCircle, FiAlertTriangle, FiEye, FiEyeOff, FiInfo, FiSend,
  FiCreditCard, FiSearch, FiChevronDown, FiCheck,
  FiGlobe, FiFileText, FiClock, FiShield, FiMessageSquare, FiDownloadCloud,
  FiLock, FiSave, FiRefreshCw, FiChevronRight, FiGrid
} from 'react-icons/fi';


interface ISMTPConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
}

interface IOmnichannelConfig {
  zaloEnabled: boolean;
  zaloAccountType: 'oa' | 'personal';
  zaloAppId: string;
  zaloSecretKey: string;
  zaloAccessToken: string;
  zaloRefreshToken: string;
  zaloCookie: string;
  telegramEnabled: boolean;
  telegramAccountType: 'bot' | 'user';
  telegramBotToken: string;
  telegramBotUsername: string;
  telegramApiId: string;
  telegramApiHash: string;
  telegramSession: string;
  facebookEnabled: boolean;
  facebookPageId: string;
  facebookPageAccessToken: string;
  facebookAppSecret: string;
  facebookVerifyToken: string;
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
  const activeTab = searchParams.get('tab');

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

  // --- GENERAL STATE ---
  const [generalConfig, setGeneralConfig] = useState({
    storeName: 'Mini CRM',
    taxCode: '',
    address: '',
    phone: '',
    email: '',
    logo: '',
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND'
  });

  // --- INVOICE TEMPLATE STATE ---
  const [invoiceConfig, setInvoiceConfig] = useState({
    title: 'HÓA ĐƠN BÁN HÀNG',
    footer: 'Cảm ơn quý khách đã mua hàng!',
    primaryColor: '#0071E3',
    showLogo: true,
    showSignature: false,
    signature: '',
    notes: ''
  });

  // --- RENEWAL STATE ---
  const [renewalConfig, setRenewalConfig] = useState({
    warningDays: 7,
    autoRemind: true,
    maxReminders: 3,
    autoSuspend: true,
    suspendAfterDays: 3,
    defaultRenewalFee: 0,
    promoMessage: ''
  });

  // --- ACCOUNT STATE ---
  const [accountInfo, setAccountInfo] = useState({ username: 'admin', email: '', role: 'admin' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // --- EMAIL TEMPLATES STATE ---
  const [emailTemplates, setEmailTemplates] = useState({
    welcome: { subject: '', body: '' },
    invoice: { subject: '', body: '' },
    renewal: { subject: '', body: '' },
    handover: { subject: '', body: '' },
    renewal_reminder: { subject: '', body: '' },
    thank_you: { subject: '', body: '' }
  });

  // --- BACKUP STATE ---
  const [backupConfig, setBackupConfig] = useState({ autoBackup: false, backupFrequency: 'weekly', lastBackup: null as string | null });
  const [exporting, setExporting] = useState(false);
  const [savingBackup, setSavingBackup] = useState(false);

  // --- OMNICHANNEL STATE ---
  const [omnichannelConfig, setOmnichannelConfig] = useState<IOmnichannelConfig>({
    zaloEnabled: false,
    zaloAccountType: 'oa',
    zaloAppId: '',
    zaloSecretKey: '',
    zaloAccessToken: '',
    zaloRefreshToken: '',
    zaloCookie: '',
    telegramEnabled: false,
    telegramAccountType: 'bot',
    telegramBotToken: '',
    telegramBotUsername: '',
    telegramApiId: '',
    telegramApiHash: '',
    telegramSession: '',
    facebookEnabled: false,
    facebookPageId: '',
    facebookPageAccessToken: '',
    facebookAppSecret: '',
    facebookVerifyToken: 'minicrm_omnichannel_verify_token_123'
  });
  const [savingOmnichannel, setSavingOmnichannel] = useState(false);

  // --- MACROS STATE ---
  interface IMacro {
    shortcut: string;
    text: string;
  }
  const [macros, setMacros] = useState<IMacro[]>([]);
  const [newShortcut, setNewShortcut] = useState('');
  const [newText, setNewText] = useState('');
  const [savingMacros, setSavingMacros] = useState(false);

  // --- NEW LOAD FUNCTIONS ---
  const loadGeneralConfig = async () => {
    try {
      const res = await api.get<{ success: boolean; data: any }>('/settings/general');
      if (res.data.success && res.data.data) setGeneralConfig(res.data.data);
    } catch (err) { console.error(err); }
  };

  const loadInvoiceConfig = async () => {
    try {
      const res = await api.get<{ success: boolean; data: any }>('/settings/invoice-template');
      if (res.data.success && res.data.data) setInvoiceConfig(res.data.data);
    } catch (err) { console.error(err); }
  };

  const loadRenewalConfig = async () => {
    try {
      const res = await api.get<{ success: boolean; data: any }>('/settings/renewal');
      if (res.data.success && res.data.data) setRenewalConfig(res.data.data);
    } catch (err) { console.error(err); }
  };

  const loadAccountInfo = async () => {
    try {
      const res = await api.get<{ success: boolean; data: any }>('/settings/account');
      if (res.data.success && res.data.data) setAccountInfo(res.data.data);
    } catch (err) { console.error(err); }
  };

  const loadEmailTemplates = async () => {
    try {
      const res = await api.get<{ success: boolean; data: any }>('/settings/email-templates');
      if (res.data.success && res.data.data) setEmailTemplates(res.data.data);
    } catch (err) { console.error(err); }
  };

  const loadBackupConfig = async () => {
    try {
      const res = await api.get<{ success: boolean; data: any }>('/settings/backup');
      if (res.data.success && res.data.data) setBackupConfig(res.data.data);
    } catch (err) { console.error(err); }
  };

  const loadOmnichannelConfig = async () => {
    try {
      const res = await api.get<{ success: boolean; data: any }>('/settings/omnichannel');
      if (res.data.success && res.data.data) setOmnichannelConfig(res.data.data);
    } catch (err) { console.error(err); }
  };

  const loadMacros = async () => {
    try {
      const res = await api.get<{ success: boolean; data: IMacro[] }>('/settings/macros');
      if (res.data.success && res.data.data) setMacros(res.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        loadConfig(), loadBankConfig(), fetchBanks(),
        loadGeneralConfig(), loadInvoiceConfig(), loadRenewalConfig(),
        loadAccountInfo(), loadEmailTemplates(), loadBackupConfig(),
        loadOmnichannelConfig(), loadMacros()
      ]);
      setLoading(false);
    };
    init();
  }, []);

  // --- GENERAL HANDLERS ---
  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGeneralConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true); setMessage(null);
      const res = await api.post('/settings/general', generalConfig);
      if (res.data.success) setMessage({ text: 'Lưu cài đặt chung thành công!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Lỗi khi lưu cài đặt chung', type: 'error' });
    } finally { setSaving(false); }
  };

  // --- INVOICE HANDLERS ---
  const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setInvoiceConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true); setMessage(null);
      const res = await api.post('/settings/invoice-template', invoiceConfig);
      if (res.data.success) setMessage({ text: 'Lưu mẫu hóa đơn thành công!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Lỗi khi lưu mẫu hóa đơn', type: 'error' });
    } finally { setSaving(false); }
  };

  // --- RENEWAL HANDLERS ---
  const handleRenewalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setRenewalConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'promoMessage' ? value : Number(value))
    }));
  };

  const handleSaveRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true); setMessage(null);
      const res = await api.post('/settings/renewal', renewalConfig);
      if (res.data.success) setMessage({ text: 'Lưu cấu hình gia hạn thành công!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Lỗi khi lưu cấu hình gia hạn', type: 'error' });
    } finally { setSaving(false); }
  };

  // --- ACCOUNT HANDLERS ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingAccount(true); setMessage(null);
      const res = await api.post('/settings/account', { action: 'update-profile', email: accountInfo.email });
      if (res.data.success) setMessage({ text: 'Cập nhật thông tin thành công!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Lỗi khi cập nhật thông tin', type: 'error' });
    } finally { setSavingAccount(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Mật khẩu mới và xác nhận không khớp', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ text: 'Mật khẩu mới phải có ít nhất 6 ký tự', type: 'error' });
      return;
    }
    try {
      setSavingPassword(true); setMessage(null);
      const res = await api.post('/settings/account', { action: 'change-password', currentPassword, newPassword });
      if (res.data.success) {
        setMessage({ text: 'Đổi mật khẩu thành công!', type: 'success' });
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      }
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Lỗi khi đổi mật khẩu', type: 'error' });
    } finally { setSavingPassword(false); }
  };

  // --- EMAIL TEMPLATES HANDLERS ---
  const handleTemplateChange = (type: 'welcome' | 'invoice' | 'renewal' | 'handover' | 'renewal_reminder' | 'thank_you', field: 'subject' | 'body', value: string) => {
    setEmailTemplates(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true); setMessage(null);
      const res = await api.post('/settings/email-templates', emailTemplates);
      if (res.data.success) setMessage({ text: 'Lưu mẫu email thành công!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Lỗi khi lưu mẫu email', type: 'error' });
    } finally { setSaving(false); }
  };

  // --- BACKUP HANDLERS ---
  const handleExportData = async () => {
    try {
      setExporting(true); setMessage(null);
      const res = await api.get('/settings/backup?action=export');
      if (res.data.success && res.data.data) {
        const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mini-crm-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        await api.post('/settings/backup', { action: 'update-last-backup' });
        setMessage({ text: 'Xuất dữ liệu thành công!', type: 'success' });
      }
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Lỗi khi xuất dữ liệu', type: 'error' });
    } finally { setExporting(false); }
  };

  const handleSaveBackupConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingBackup(true); setMessage(null);
      const res = await api.post('/settings/backup', backupConfig);
      if (res.data.success) setMessage({ text: 'Lưu cấu hình sao lưu thành công!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Lỗi khi lưu cấu hình sao lưu', type: 'error' });
    } finally { setSavingBackup(false); }
  };

  const handleOmnichannelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setOmnichannelConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveOmnichannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingOmnichannel(true);
      setMessage(null);
      const res = await api.post('/settings/omnichannel', omnichannelConfig);
      if (res.data.success) {
        setMessage({ text: 'Lưu cấu hình đấu nối đa kênh thành công!', type: 'success' });
      }
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Lỗi khi lưu cấu hình đấu nối', type: 'error' });
    } finally {
      setSavingOmnichannel(false);
    }
  };

  // --- MACROS HANDLERS ---
  const handleSaveMacros = async (updatedMacros: IMacro[]) => {
    try {
      setSavingMacros(true);
      const res = await api.post('/settings/macros', { macros: updatedMacros });
      if (res.data.success) {
        setMacros(res.data.data);
      }
    } catch (err: any) {
      alert('Lỗi khi lưu câu trả lời nhanh: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingMacros(false);
    }
  };

  const handleAddMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcut.startsWith('/')) {
      alert('Phím tắt phải bắt đầu bằng dấu gạch chéo / (Ví dụ: /payment)');
      return;
    }
    if (macros.some(m => m.shortcut.toLowerCase() === newShortcut.toLowerCase())) {
      alert('Phím tắt này đã tồn tại!');
      return;
    }
    const updated = [...macros, { shortcut: newShortcut, text: newText }];
    setMacros(updated);
    handleSaveMacros(updated);
    setNewShortcut('');
    setNewText('');
  };

  const handleDeleteMacro = (index: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa câu trả lời nhanh này?')) {
      const updated = macros.filter((_, i) => i !== index);
      setMacros(updated);
      handleSaveMacros(updated);
    }
  };


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
          {!activeTab && 'Quản lý toàn bộ cấu hình hệ thống cửa hàng, tích hợp kênh chat, cấu hình thanh toán và mẫu email của bạn.'}
          {activeTab === 'smtp' && 'Cấu hình máy chủ SMTP Gmail để tự động gửi thông báo hóa đơn, nhắc nợ và bàn giao tài nguyên cho khách hàng'}
          {activeTab === 'bank' && 'Cấu hình tài khoản ngân hàng nhận tiền thụ hưởng. Hệ thống sẽ tự tạo mã VietQR khớp số tiền và cú pháp trên hóa đơn PDF'}
          {activeTab === 'general' && 'Cập nhật thông tin doanh nghiệp, logo, mã số thuế, địa chỉ, múi giờ và đơn vị tiền tệ'}
          {activeTab === 'invoice' && 'Tùy chỉnh giao diện hóa đơn PDF: tiêu đề, màu sắc, chữ ký và ghi chú'}
          {activeTab === 'renewal' && 'Cấu hình cảnh báo gia hạn, nhắc nợ tự động và tạm ngưng tài khoản khi quá hạn'}
          {activeTab === 'account' && 'Quản lý thông tin tài khoản Admin, thay đổi email và đổi mật khẩu đăng nhập'}
          {activeTab === 'email-templates' && 'Tùy chỉnh nội dung email gửi cho khách hàng: bàn giao, nhắc gia hạn và cảm ơn'}
          {activeTab === 'backup' && 'Sao lưu và xuất dữ liệu toàn bộ hệ thống để đảm bảo an toàn thông tin'}
          {activeTab === 'omnichannel' && 'Đấu nối API & Webhooks cho các kênh nhắn tin: Zalo OA, Telegram Bot, Facebook Messenger để hợp nhất vào Omnichannel Inbox'}
        </p>
      </div>

      {/* Nút Quay lại nếu đang ở trong tab chi tiết */}
      {activeTab ? (
        <button 
          onClick={() => setSearchParams({})} 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F5F5F7',
            border: '1px solid #E5E5EA',
            color: '#1D1D1F',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '1.75rem',
            padding: '8px 16px',
            borderRadius: '10px',
            transition: 'all 0.2s',
            fontSize: '0.85rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E5E5EA';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F5F5F7';
          }}
        >
          ← Quay lại danh mục Cài đặt
        </button>
      ) : null}


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
            <div className="settings-responsive-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.2rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <FiServer style={{ color: '#0071E3' }} /> Máy Chủ Gửi Email (SMTP)
                    </h2>
                    <button
                      type="button"
                      onClick={applyGmailDefaults}
                      style={{
                        backgroundColor: '#E1EFFF',
                        color: '#0071E3',
                        border: '1px solid rgba(0, 113, 227, 0.15)',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'center',
                        display: 'block',
                        transition: 'all 0.2s'
                      }}
                    >
                      Mặc định Gmail
                    </button>
                  </div>

                  <form onSubmit={handleSaveSMTPConfig}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
            <div className="settings-responsive-grid">

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

          {/* TAB 3: CÀI ĐẶT CHUNG */}
          {activeTab === 'general' && (
            <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '0.75rem' }}>
                <FiGlobe style={{ color: '#0071E3' }} /> Cài Đặt Chung
              </h2>
              <form onSubmit={handleSaveGeneral}>
                <div className="settings-grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tên cửa hàng / Doanh nghiệp:</label>
                    <input type="text" name="storeName" value={generalConfig.storeName} onChange={handleGeneralChange} placeholder="e.g. Mini CRM" required style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Mã số thuế:</label>
                    <input type="text" name="taxCode" value={generalConfig.taxCode} onChange={handleGeneralChange} placeholder="e.g. 0123456789" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Địa chỉ:</label>
                  <input type="text" name="address" value={generalConfig.address} onChange={handleGeneralChange} placeholder="Nhập địa chỉ doanh nghiệp" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                </div>
                <div className="settings-grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Số điện thoại:</label>
                    <input type="text" name="phone" value={generalConfig.phone} onChange={handleGeneralChange} placeholder="e.g. 0987654321" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Email:</label>
                    <input type="email" name="email" value={generalConfig.email} onChange={handleGeneralChange} placeholder="e.g. info@example.com" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                </div>
                <div className="settings-grid-3">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Múi giờ:</label>
                    <select name="timezone" value={generalConfig.timezone} onChange={handleGeneralChange} style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}>
                      <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                      <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                      <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Đơn vị tiền tệ:</label>
                    <select name="currency" value={generalConfig.currency} onChange={handleGeneralChange} style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}>
                      <option value="VND">VND (₫)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>URL Logo:</label>
                    <input type="text" name="logo" value={generalConfig.logo} onChange={handleGeneralChange} placeholder="https://..." style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                </div>
                <button type="submit" className="btn-save" disabled={saving} style={{ width: '100%', height: '44px', fontWeight: 600, borderRadius: '12px' }}>
                  {saving ? 'Đang lưu...' : 'Lưu Cài Đặt Chung'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: MẪU HÓA ĐƠN PDF */}
          {activeTab === 'invoice' && (
            <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '0.75rem' }}>
                <FiFileText style={{ color: '#0071E3' }} /> Mẫu Hóa Đơn PDF
              </h2>
              <form onSubmit={handleSaveInvoice}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tiêu đề hóa đơn:</label>
                    <input type="text" name="title" value={invoiceConfig.title} onChange={handleInvoiceChange} placeholder="e.g. HÓA ĐƠN BÁN HÀNG" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Màu chủ đạo:</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="color" name="primaryColor" value={invoiceConfig.primaryColor} onChange={handleInvoiceChange} style={{ width: '44px', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2px', cursor: 'pointer' }} />
                      <input type="text" name="primaryColor" value={invoiceConfig.primaryColor} onChange={handleInvoiceChange} style={{ flex: 1, height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', outline: 'none' }} />
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Chân trang (Footer):</label>
                  <input type="text" name="footer" value={invoiceConfig.footer} onChange={handleInvoiceChange} placeholder="e.g. Cảm ơn quý khách đã mua hàng!" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Ghi chú:</label>
                  <textarea name="notes" value={invoiceConfig.notes} onChange={handleInvoiceChange} placeholder="Ghi chú thêm trên hóa đơn..." rows={3} style={{ borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', width: '100%', outline: 'none', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="showLogo" checked={invoiceConfig.showLogo} onChange={handleInvoiceChange} />
                    <span>Hiển thị Logo</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="showSignature" checked={invoiceConfig.showSignature} onChange={handleInvoiceChange} />
                    <span>Hiển thị Chữ ký</span>
                  </label>
                </div>
                {invoiceConfig.showSignature && (
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nội dung chữ ký:</label>
                    <textarea name="signature" value={invoiceConfig.signature} onChange={handleInvoiceChange} placeholder="Người bán: ..." rows={2} style={{ borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', width: '100%', outline: 'none', resize: 'vertical' }} />
                  </div>
                )}
                <button type="submit" className="btn-save" disabled={saving} style={{ width: '100%', height: '44px', fontWeight: 600, borderRadius: '12px' }}>
                  {saving ? 'Đang lưu...' : 'Lưu Mẫu Hóa Đơn'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: CẤU HÌNH GIA HẠN */}
          {activeTab === 'renewal' && (
            <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '0.75rem' }}>
                <FiClock style={{ color: '#0071E3' }} /> Cấu Hình Gia Hạn
              </h2>
              <form onSubmit={handleSaveRenewal}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Số ngày cảnh báo trước khi hết hạn:</label>
                    <input type="number" name="warningDays" value={renewalConfig.warningDays} onChange={handleRenewalChange} min={1} max={60} style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tối đa số lần nhắc:</label>
                    <input type="number" name="maxReminders" value={renewalConfig.maxReminders} onChange={handleRenewalChange} min={1} max={20} style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Số ngày sau hết hạn sẽ tạm ngưng:</label>
                    <input type="number" name="suspendAfterDays" value={renewalConfig.suspendAfterDays} onChange={handleRenewalChange} min={0} max={90} style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Phí gia hạn mặc định (VNĐ):</label>
                    <input type="number" name="defaultRenewalFee" value={renewalConfig.defaultRenewalFee} onChange={handleRenewalChange} min={0} style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="autoRemind" checked={renewalConfig.autoRemind} onChange={handleRenewalChange} />
                    <span>Tự động nhắc gia hạn</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="autoSuspend" checked={renewalConfig.autoSuspend} onChange={handleRenewalChange} />
                    <span>Tự động tạm ngưng khi quá hạn</span>
                  </label>
                </div>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tin nhắn khuyến mãi (kèm email nhắc):</label>
                  <textarea name="promoMessage" value={renewalConfig.promoMessage} onChange={handleRenewalChange} placeholder="e.g. Giảm 10% phí gia hạn khi thanh toán trước hạn..." rows={2} style={{ borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', width: '100%', outline: 'none', resize: 'vertical' }} />
                </div>
                <button type="submit" className="btn-save" disabled={saving} style={{ width: '100%', height: '44px', fontWeight: 600, borderRadius: '12px' }}>
                  {saving ? 'Đang lưu...' : 'Lưu Cấu Hình Gia Hạn'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 6: TÀI KHOẢN ADMIN */}
          {activeTab === 'account' && (
            <div className="settings-responsive-grid">
              <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '0.75rem' }}>
                  <FiUser style={{ color: '#0071E3' }} /> Thông Tin Cá Nhân
                </h2>
                <form onSubmit={handleSaveProfile}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tên đăng nhập:</label>
                    <input type="text" value={accountInfo.username} disabled style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none', backgroundColor: '#F5F5F7', color: '#86868B' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Email:</label>
                    <input type="email" value={accountInfo.email} onChange={e => setAccountInfo(prev => ({ ...prev, email: e.target.value }))} placeholder="admin@example.com" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Vai trò:</label>
                    <input type="text" value={accountInfo.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'} disabled style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none', backgroundColor: '#F5F5F7', color: '#86868B' }} />
                  </div>
                  <button type="submit" className="btn-save" disabled={savingAccount} style={{ width: '100%', height: '44px', fontWeight: 600, borderRadius: '12px' }}>
                    {savingAccount ? 'Đang lưu...' : <><FiSave style={{ marginRight: '6px' }} /> Cập Nhật Thông Tin</>}
                  </button>
                </form>
              </div>

              <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '0.75rem' }}>
                  <FiLock style={{ color: '#FF9500' }} /> Đổi Mật Khẩu
                </h2>
                <form onSubmit={handleChangePassword}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Mật khẩu hiện tại:</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Nhập mật khẩu hiện tại" required style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Mật khẩu mới:</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" required minLength={6} style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Xác nhận mật khẩu mới:</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" required minLength={6} style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <button type="submit" className="btn-save" disabled={savingPassword} style={{ width: '100%', height: '44px', fontWeight: 600, borderRadius: '12px', backgroundColor: '#FF9500' }}>
                    {savingPassword ? 'Đang đổi mật khẩu...' : <><FiRefreshCw style={{ marginRight: '6px' }} /> Đổi Mật Khẩu</>}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 7: MẪU EMAIL */}
          {activeTab === 'email-templates' && (
            <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '0.75rem' }}>
                <FiMessageSquare style={{ color: '#0071E3' }} /> Mẫu Email Tự Động
              </h2>
              <form onSubmit={handleSaveTemplates}>
                
                {/* Welcome / Registration Template */}
                <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#F2F8FF', borderRadius: '12px', border: '1px solid #D2E9FF' }}>
                  <h3 style={{ fontSize: '1rem', color: '#0071E3', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiUser style={{ color: '#0071E3' }} /> Email Đăng Ký Thành Viên Mới
                  </h3>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tiêu đề:</label>
                    <input type="text" value={emailTemplates.welcome?.subject || ''} onChange={e => handleTemplateChange('welcome', 'subject', e.target.value)} placeholder="🎉 Chào mừng thành viên mới - {{customer_name}}" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nội dung:</label>
                    <textarea value={emailTemplates.welcome?.body || ''} onChange={e => handleTemplateChange('welcome', 'body', e.target.value)} placeholder="Xin chào {{customer_name}},..." rows={4} style={{ borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', width: '100%', outline: 'none', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                  </div>
                  <small style={{ color: '#86868B', fontSize: '0.75rem' }}>Biến hỗ trợ: {'{{customer_name}}'}, {'{{store_name}}'}</small>
                </div>

                {/* Invoice Template */}
                <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#FAF5FE', borderRadius: '12px', border: '1px solid #EAD8F7' }}>
                  <h3 style={{ fontSize: '1rem', color: '#AF52DE', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiFileText style={{ color: '#AF52DE' }} /> Email Gửi Hóa Đơn Thanh Toán
                  </h3>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tiêu đề:</label>
                    <input type="text" value={emailTemplates.invoice?.subject || ''} onChange={e => handleTemplateChange('invoice', 'subject', e.target.value)} placeholder="🧾 Hóa đơn thanh toán đơn hàng {{order_id}} - {{customer_name}}" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nội dung:</label>
                    <textarea value={emailTemplates.invoice?.body || ''} onChange={e => handleTemplateChange('invoice', 'body', e.target.value)} placeholder="Xin chào {{customer_name}},..." rows={4} style={{ borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', width: '100%', outline: 'none', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                  </div>
                  <small style={{ color: '#86868B', fontSize: '0.75rem' }}>Biến hỗ trợ: {'{{customer_name}}'}, {'{{store_name}}'}, {'{{order_id}}'}, {'{{total_amount}}'}, {'{{payment_date}}'}</small>
                </div>

                {/* Renewal (Gia Hạn) Template */}
                <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#F4FBF6', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
                  <h3 style={{ fontSize: '1rem', color: '#34C759', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiClock style={{ color: '#34C759' }} /> Email Xác Nhận Gia Hạn Thành Công
                  </h3>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tiêu đề:</label>
                    <input type="text" value={emailTemplates.renewal?.subject || ''} onChange={e => handleTemplateChange('renewal', 'subject', e.target.value)} placeholder="🔄 Xác nhận gia hạn dịch vụ thành công - {{customer_name}}" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nội dung:</label>
                    <textarea value={emailTemplates.renewal?.body || ''} onChange={e => handleTemplateChange('renewal', 'body', e.target.value)} placeholder="Xin chào {{customer_name}},..." rows={4} style={{ borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', width: '100%', outline: 'none', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                  </div>
                  <small style={{ color: '#86868B', fontSize: '0.75rem' }}>Biến hỗ trợ: {'{{customer_name}}'}, {'{{store_name}}'}, {'{{product_name}}'}, {'{{expiry_date}}'}</small>
                </div>

                {/* Handover Template */}
                <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#F5F5F7', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '1rem', color: '#1D1D1F', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiMail style={{ color: '#8E8E93' }} /> Email Bàn Giao Tài Khoản
                  </h3>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tiêu đề:</label>
                    <input type="text" value={emailTemplates.handover?.subject || ''} onChange={e => handleTemplateChange('handover', 'subject', e.target.value)} placeholder="🎉 Bàn giao tài khoản - {{customer_name}}" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nội dung:</label>
                    <textarea value={emailTemplates.handover?.body || ''} onChange={e => handleTemplateChange('handover', 'body', e.target.value)} placeholder="Xin chào {{customer_name}},..." rows={4} style={{ borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', width: '100%', outline: 'none', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                  </div>
                  <small style={{ color: '#86868B', fontSize: '0.75rem' }}>Biến hỗ trợ: {'{{customer_name}}'}, {'{{store_name}}'}, {'{{account_info}}'}, {'{{expiry_date}}'}</small>
                </div>

                {/* Renewal Reminder Template */}
                <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#FFFDF0', borderRadius: '12px', border: '1px solid #FFEBB3' }}>
                  <h3 style={{ fontSize: '1rem', color: '#D27B00', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiClock style={{ color: '#FF9500' }} /> Email Nhắc Gia Hạn
                  </h3>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tiêu đề:</label>
                    <input type="text" value={emailTemplates.renewal_reminder?.subject || ''} onChange={e => handleTemplateChange('renewal_reminder', 'subject', e.target.value)} placeholder="⚠️ Nhắc gia hạn - {{customer_name}}" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nội dung:</label>
                    <textarea value={emailTemplates.renewal_reminder?.body || ''} onChange={e => handleTemplateChange('renewal_reminder', 'body', e.target.value)} placeholder="Xin chào {{customer_name}},..." rows={4} style={{ borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', width: '100%', outline: 'none', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                  </div>
                  <small style={{ color: '#86868B', fontSize: '0.75rem' }}>Biến hỗ trợ: {'{{customer_name}}'}, {'{{store_name}}'}, {'{{expiry_date}}'}</small>
                </div>

                {/* Thank You Template */}
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#EBF9EB', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
                  <h3 style={{ fontSize: '1rem', color: '#2E7D32', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiCheckCircle style={{ color: '#34C759' }} /> Email Cảm Ơn
                  </h3>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tiêu đề:</label>
                    <input type="text" value={emailTemplates.thank_you?.subject || ''} onChange={e => handleTemplateChange('thank_you', 'subject', e.target.value)} placeholder="🙏 Cảm ơn - {{customer_name}}" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nội dung:</label>
                    <textarea value={emailTemplates.thank_you?.body || ''} onChange={e => handleTemplateChange('thank_you', 'body', e.target.value)} placeholder="Xin chào {{customer_name}},..." rows={4} style={{ borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', width: '100%', outline: 'none', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                  </div>
                  <small style={{ color: '#86868B', fontSize: '0.75rem' }}>Biến hỗ trợ: {'{{customer_name}}'}, {'{{store_name}}'}</small>
                </div>

                <button type="submit" className="btn-save" disabled={saving} style={{ width: '100%', height: '44px', fontWeight: 600, borderRadius: '12px' }}>
                  {saving ? 'Đang lưu...' : 'Lưu Tất Cả Mẫu Email'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 8: SAO LƯU DỮ LIỆU */}
          {activeTab === 'backup' && (
            <div className="settings-responsive-grid">
              <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '0.75rem' }}>
                  <FiDownloadCloud style={{ color: '#0071E3' }} /> Xuất Dữ Liệu
                </h2>
                <div style={{ marginBottom: '1.5rem', color: '#515154', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 0.75rem 0' }}>Xuất toàn bộ dữ liệu hệ thống bao gồm:</p>
                  <ul style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.25rem' }}>
                    <li>Khách hàng</li>
                    <li>Tài khoản / Tài nguyên</li>
                    <li>Đơn hàng & Hóa đơn</li>
                    <li>Nhà cung cấp</li>
                    <li>Bản quyền cá nhân</li>
                    <li>Cài đặt hệ thống</li>
                  </ul>
                  <p style={{ margin: 0 }}>Dữ liệu sẽ được tải xuống dưới dạng file JSON.</p>
                </div>
                <button onClick={handleExportData} disabled={exporting} style={{ width: '100%', height: '44px', fontWeight: 600, borderRadius: '12px', border: 'none', backgroundColor: '#0071E3', color: '#FFF', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <FiDownloadCloud /> {exporting ? 'Đang xuất dữ liệu...' : 'Xuất Dữ Liệu Ngay'}
                </button>
              </div>

              <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid #F5F5F7', paddingBottom: '0.75rem' }}>
                  <FiSettings style={{ color: '#FF9500' }} /> Cấu Hình Sao Lưu
                </h2>
                <form onSubmit={handleSaveBackupConfig}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1rem' }}>
                      <input type="checkbox" checked={backupConfig.autoBackup} onChange={e => setBackupConfig(prev => ({ ...prev, autoBackup: e.target.checked }))} />
                      <span>Tự động sao lưu</span>
                    </label>
                  </div>
                  {backupConfig.autoBackup && (
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tần suất sao lưu:</label>
                      <select value={backupConfig.backupFrequency} onChange={e => setBackupConfig(prev => ({ ...prev, backupFrequency: e.target.value }))} style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}>
                        <option value="daily">Hàng ngày</option>
                        <option value="weekly">Hàng tuần</option>
                        <option value="monthly">Hàng tháng</option>
                      </select>
                    </div>
                  )}
                  {backupConfig.lastBackup && (
                    <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#EBF9EB', borderRadius: '8px', color: '#2E7D32', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiCheckCircle size={14} />
                      <span>Lần sao lưu gần nhất: {new Date(backupConfig.lastBackup).toLocaleString('vi-VN')}</span>
                    </div>
                  )}
                  <button type="submit" className="btn-save" disabled={savingBackup} style={{ width: '100%', height: '44px', fontWeight: 600, borderRadius: '12px' }}>
                    {savingBackup ? 'Đang lưu...' : 'Lưu Cấu Hình Sao Lưu'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 9: ĐẤU NỐI CHAT (OMNICHANNEL) */}
          {activeTab === 'omnichannel' && (
            <form onSubmit={handleSaveOmnichannel} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div className="table-card widget" style={{ padding: '1.75rem', borderRadius: '20px', backgroundColor: '#FFF' }}>
                <div style={{ borderBottom: '1px solid #F5F5F7', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <FiMessageSquare style={{ color: '#0071E3' }} /> Cấu Hình Kết Nối Đa Kênh (Omnichannel Webhooks)
                  </h2>
                  <p style={{ color: '#86868B', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                    Nhận diện khách hàng tự động khi họ nhắn tin từ Zalo OA, Telegram, Facebook Messenger về CRM.
                  </p>
                </div>

                {/* WEBHOOK URL GENERAL INFO */}
                <div style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #E5E5EA' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1D1D1F', margin: '0 0 0.5rem 0' }}>🔗 Link Webhook nhận tin nhắn của bạn</h3>
                  <p style={{ fontSize: '0.8rem', color: '#515154', margin: '0 0 0.75rem 0' }}>
                    Hãy copy đường dẫn webhook dưới đây để điền vào phần cấu hình Webhook trên trang quản trị nhà phát triển của Zalo, Telegram, và Facebook:
                  </p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/api/omnichannel/webhook`}
                      style={{
                        flex: 1,
                        minWidth: '280px',
                        height: '38px',
                        backgroundColor: '#FFF',
                        border: '1px solid #D2D2D7',
                        borderRadius: '8px',
                        padding: '0 10px',
                        fontSize: '0.85rem',
                        color: '#1D1D1F',
                        fontFamily: 'monospace',
                        outline: 'none'
                      }}
                      id="webhook_url_input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const copyText = document.getElementById('webhook_url_input') as HTMLInputElement;
                        if (copyText) {
                          navigator.clipboard.writeText(copyText.value);
                          alert('Đã copy đường dẫn Webhook!');
                        }
                      }}
                      style={{
                        height: '38px',
                        backgroundColor: '#0071E3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 16px',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

                  {/* 1. TELEGRAM BOT INTEGRATION */}
                  <div style={{ border: '1px solid #E5E5EA', borderRadius: '16px', padding: '1.5rem', backgroundColor: '#FFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ backgroundColor: '#229ED9', color: '#FFF', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>T</div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1rem', color: '#1D1D1F' }}>Đấu nối Telegram Bot</h3>
                          <span style={{ fontSize: '0.75rem', color: '#86868B' }}>Tích hợp chatbot Telegram chăm sóc khách hàng</span>
                        </div>
                      </div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                        <span style={{ fontSize: '0.8rem', marginRight: '8px', fontWeight: 500, color: omnichannelConfig.telegramEnabled ? '#34C759' : '#86868B' }}>
                          {omnichannelConfig.telegramEnabled ? 'Đang bật' : 'Đang tắt'}
                        </span>
                        <input
                          type="checkbox"
                          name="telegramEnabled"
                          checked={omnichannelConfig.telegramEnabled}
                          onChange={handleOmnichannelChange}
                          style={{ width: '38px', height: '20px', cursor: 'pointer' }}
                        />
                      </label>
                    </div>

                    {omnichannelConfig.telegramEnabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ maxWidth: '400px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Loại kết nối Telegram:</label>
                          <select
                            name="telegramAccountType"
                            value={omnichannelConfig.telegramAccountType}
                            onChange={handleOmnichannelChange}
                            style={{ height: '38px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none', fontSize: '0.85rem' }}
                          >
                            <option value="bot">Sử dụng Bot Telegram (Khuyên dùng, chính thống)</option>
                            <option value="user">Sử dụng Tài khoản Cá nhân (Userbot Client)</option>
                          </select>
                        </div>

                        {omnichannelConfig.telegramAccountType === 'bot' ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Telegram Bot Token:</label>
                                <input
                                  type="password"
                                  name="telegramBotToken"
                                  value={omnichannelConfig.telegramBotToken}
                                  onChange={handleOmnichannelChange}
                                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                                  style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Username của Bot (không kèm @):</label>
                                <input
                                  type="text"
                                  name="telegramBotUsername"
                                  value={omnichannelConfig.telegramBotUsername}
                                  onChange={handleOmnichannelChange}
                                  placeholder="e.g. MiniCRM_AssistantBot"
                                  style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                                />
                              </div>
                            </div>

                            <div style={{ backgroundColor: '#F9FCFF', border: '1px solid #D2E9FF', borderRadius: '12px', padding: '1rem', fontSize: '0.8rem', color: '#334E68', lineHeight: '1.5' }}>
                              <strong style={{ display: 'block', color: '#102A43', marginBottom: '6px' }}>💡 Hướng dẫn lấy Token Telegram Bot:</strong>
                              <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                                <li style={{ marginBottom: '4px' }}>Mở Telegram, chat với <strong>@BotFather</strong></li>
                                <li style={{ marginBottom: '4px' }}>Nhập <code>/newbot</code> để tạo Bot mới</li>
                                <li style={{ marginBottom: '4px' }}>Copy dãy ký tự <strong>HTTP API Token</strong> dán vào ô bên trái</li>
                                <li>Bấm <strong>Lưu cấu hình</strong>.</li>
                              </ol>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>API ID:</label>
                                  <input
                                    type="text"
                                    name="telegramApiId"
                                    value={omnichannelConfig.telegramApiId}
                                    onChange={handleOmnichannelChange}
                                    placeholder="e.g. 1234567"
                                    style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                                  />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>API Hash:</label>
                                  <input
                                    type="password"
                                    name="telegramApiHash"
                                    value={omnichannelConfig.telegramApiHash}
                                    onChange={handleOmnichannelChange}
                                    placeholder="e.g. abcde12345fghij..."
                                    style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                                  />
                                </div>
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Session String / Auth Key (Chuỗi phiên đăng nhập):</label>
                                <input
                                  type="text"
                                  name="telegramSession"
                                  value={omnichannelConfig.telegramSession}
                                  onChange={handleOmnichannelChange}
                                  placeholder="Nhập chuỗi Session chuỗi dài hoặc để trống để login bằng OTP trong log"
                                  style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                                />
                              </div>
                            </div>

                            <div style={{ backgroundColor: '#FDF6F6', border: '1px solid #FFE3E3', borderRadius: '12px', padding: '1rem', fontSize: '0.8rem', color: '#662222', lineHeight: '1.5' }}>
                              <strong style={{ display: 'block', color: '#4A1515', marginBottom: '6px' }}>💡 Hướng dẫn tài khoản cá nhân:</strong>
                              <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                                <li style={{ marginBottom: '4px' }}>Truy cập <strong>my.telegram.org</strong> và đăng nhập bằng số điện thoại của bạn.</li>
                                <li style={{ marginBottom: '4px' }}>Vào mục <strong>API development tools</strong>.</li>
                                <li style={{ marginBottom: '4px' }}>Tạo ứng dụng để lấy mã <strong>API ID</strong> và <strong>API Hash</strong> điền sang bên trái.</li>
                                <li>Chuỗi Session có thể được khởi tạo bằng công cụ script userbot (như Telethon/GramJS) để duy trì đăng nhập mà không cần OTP lại.</li>
                              </ol>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. ZALO OA INTEGRATION */}
                  <div style={{ border: '1px solid #E5E5EA', borderRadius: '16px', padding: '1.5rem', backgroundColor: '#FFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ backgroundColor: '#0068FF', color: '#FFF', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>Z</div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1rem', color: '#1D1D1F' }}>Đấu nối Zalo Official Account (OA)</h3>
                          <span style={{ fontSize: '0.75rem', color: '#86868B' }}>Nhận tin nhắn chăm sóc khách hàng tập trung Zalo</span>
                        </div>
                      </div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                        <span style={{ fontSize: '0.8rem', marginRight: '8px', fontWeight: 500, color: omnichannelConfig.zaloEnabled ? '#34C759' : '#86868B' }}>
                          {omnichannelConfig.zaloEnabled ? 'Đang bật' : 'Đang tắt'}
                        </span>
                        <input
                          type="checkbox"
                          name="zaloEnabled"
                          checked={omnichannelConfig.zaloEnabled}
                          onChange={handleOmnichannelChange}
                          style={{ width: '38px', height: '20px', cursor: 'pointer' }}
                        />
                      </label>
                    </div>

                    {omnichannelConfig.zaloEnabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ maxWidth: '400px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Loại kết nối Zalo:</label>
                          <select
                            name="zaloAccountType"
                            value={omnichannelConfig.zaloAccountType}
                            onChange={handleOmnichannelChange}
                            style={{ height: '38px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none', fontSize: '0.85rem' }}
                          >
                            <option value="oa">Sử dụng Zalo Official Account (OA - Khuyên dùng, chính thống)</option>
                            <option value="personal">Sử dụng Zalo Cá nhân (Cookie/Session emulation)</option>
                          </select>
                        </div>

                        {omnichannelConfig.zaloAccountType === 'oa' ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Zalo App ID:</label>
                                  <input
                                    type="text"
                                    name="zaloAppId"
                                    value={omnichannelConfig.zaloAppId}
                                    onChange={handleOmnichannelChange}
                                    placeholder="e.g. 17892305712893"
                                    style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                                  />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>App Secret Key:</label>
                                  <input
                                    type="password"
                                    name="zaloSecretKey"
                                    value={omnichannelConfig.zaloSecretKey}
                                    onChange={handleOmnichannelChange}
                                    placeholder="Nhập Secret Key"
                                    style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                                  />
                                </div>
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Zalo Access Token (OAuth):</label>
                                <input
                                  type="password"
                                  name="zaloAccessToken"
                                  value={omnichannelConfig.zaloAccessToken}
                                  onChange={handleOmnichannelChange}
                                  placeholder="Nhập Access Token dài"
                                  style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Zalo Refresh Token:</label>
                                <input
                                  type="password"
                                  name="zaloRefreshToken"
                                  value={omnichannelConfig.zaloRefreshToken}
                                  onChange={handleOmnichannelChange}
                                  placeholder="Nhập Refresh Token dùng để tự refresh"
                                  style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                                />
                              </div>
                            </div>

                            <div style={{ backgroundColor: '#F9FCFF', border: '1px solid #D2E9FF', borderRadius: '12px', padding: '1rem', fontSize: '0.8rem', color: '#334E68', lineHeight: '1.5' }}>
                              <strong style={{ display: 'block', color: '#102A43', marginBottom: '6px' }}>💡 Hướng dẫn lấy Token Zalo OA:</strong>
                              <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                                <li style={{ marginBottom: '4px' }}>Truy cập <strong>developers.zalo.me</strong></li>
                                <li style={{ marginBottom: '4px' }}>Tạo ứng dụng mới liên kết với Zalo OA của bạn.</li>
                                <li style={{ marginBottom: '4px' }}>Cấp quyền tin nhắn và tạo mã Access/Refresh Token kiểm thử dán sang bên trái.</li>
                                <li>Nhập Webhook URL ở đầu trang vào phần Webhook của Zalo console.</li>
                              </ol>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Zalo Cookie (zpw_sek / Cookie chuỗi phiên):</label>
                                <textarea
                                  name="zaloCookie"
                                  value={omnichannelConfig.zaloCookie}
                                  onChange={handleOmnichannelChange}
                                  placeholder="Nhập chuỗi Cookie zpw_sek lấy từ trình duyệt hoặc Extension F12..."
                                  rows={4}
                                  style={{ borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', width: '100%', outline: 'none', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                />
                              </div>
                            </div>

                            <div style={{ backgroundColor: '#FDF6F6', border: '1px solid #FFE3E3', borderRadius: '12px', padding: '1rem', fontSize: '0.8rem', color: '#662222', lineHeight: '1.5' }}>
                              <strong style={{ display: 'block', color: '#4A1515', marginBottom: '6px' }}>💡 Hướng dẫn tài khoản cá nhân Zalo:</strong>
                              <p style={{ margin: '0 0 6px 0' }}>
                                Kết nối Zalo cá nhân yêu cầu giả lập phiên đăng nhập (Zalo Web API). Bạn cần lấy cookie phiên hoạt động của mình:
                              </p>
                              <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                                <li style={{ marginBottom: '4px' }}>Đăng nhập vào Zalo Web (`chat.zalo.me`) trên trình duyệt máy tính.</li>
                                <li style={{ marginBottom: '4px' }}>F12 &gt; Application (Ứng dụng) &gt; Cookies &gt; chat.zalo.me</li>
                                <li style={{ marginBottom: '4px' }}>Sao chép giá trị của cookie có tên <strong>zpw_sek</strong> (chuỗi mã hóa phiên đăng nhập).</li>
                                <li>Dán giá trị đó vào ô bên trái. * Lưu ý: Phiên Cookie cá nhân có thể hết hạn sau vài tuần và cần cập nhật lại khi mất kết nối.</li>
                              </ol>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. FACEBOOK MESSENGER INTEGRATION */}
                  <div style={{ border: '1px solid #E5E5EA', borderRadius: '16px', padding: '1.5rem', backgroundColor: '#FFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ backgroundColor: '#1877F2', color: '#FFF', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>F</div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1rem', color: '#1D1D1F' }}>Đấu nối Facebook Messenger</h3>
                          <span style={{ fontSize: '0.75rem', color: '#86868B' }}>Kết nối Fanpage để trả lời inbox tập trung ngay trên CRM</span>
                        </div>
                      </div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                        <span style={{ fontSize: '0.8rem', marginRight: '8px', fontWeight: 500, color: omnichannelConfig.facebookEnabled ? '#34C759' : '#86868B' }}>
                          {omnichannelConfig.facebookEnabled ? 'Đang bật' : 'Đang tắt'}
                        </span>
                        <input
                          type="checkbox"
                          name="facebookEnabled"
                          checked={omnichannelConfig.facebookEnabled}
                          onChange={handleOmnichannelChange}
                          style={{ width: '38px', height: '20px', cursor: 'pointer' }}
                        />
                      </label>
                    </div>

                    {omnichannelConfig.facebookEnabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Facebook Page ID:</label>
                              <input
                                type="text"
                                name="facebookPageId"
                                value={omnichannelConfig.facebookPageId}
                                onChange={handleOmnichannelChange}
                                placeholder="e.g. 10928371908273"
                                style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>App Secret Key:</label>
                              <input
                                type="password"
                                name="facebookAppSecret"
                                value={omnichannelConfig.facebookAppSecret}
                                onChange={handleOmnichannelChange}
                                placeholder="App Secret Key"
                                style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                              />
                            </div>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Page Access Token:</label>
                            <input
                              type="password"
                              name="facebookPageAccessToken"
                              value={omnichannelConfig.facebookPageAccessToken}
                              onChange={handleOmnichannelChange}
                              placeholder="EAAG..."
                              style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Verify Token (Chuỗi xác minh Webhook tự đặt):</label>
                            <input
                              type="text"
                              name="facebookVerifyToken"
                              value={omnichannelConfig.facebookVerifyToken}
                              onChange={handleOmnichannelChange}
                              placeholder="Nhập verify token tùy ý"
                              style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none' }}
                            />
                          </div>
                        </div>

                        <div style={{ backgroundColor: '#F9FCFF', border: '1px solid #D2E9FF', borderRadius: '12px', padding: '1rem', fontSize: '0.8rem', color: '#334E68', lineHeight: '1.5' }}>
                          <strong style={{ display: 'block', color: '#102A43', marginBottom: '6px' }}>💡 Hướng dẫn kết nối Facebook Fanpage:</strong>
                          <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                            <li style={{ marginBottom: '4px' }}>Truy cập <strong>developers.facebook.com</strong> &gt; Tạo App loại kinh doanh/doanh nghiệp.</li>
                            <li style={{ marginBottom: '4px' }}>Thêm sản phẩm <strong>Messenger</strong> vào ứng dụng của bạn.</li>
                            <li style={{ marginBottom: '4px' }}>Liên kết với Fanpage của bạn để lấy mã <strong>Page ID</strong> và tạo ra **Page Access Token**.</li>
                            <li style={{ marginBottom: '4px' }}>Cài đặt Webhook, nhập đường dẫn Webhook của bạn ở đầu trang, và nhập <strong>Verify Token</strong> khớp với ô bên cạnh.</li>
                            <li>Đăng ký (Subscribe) các sự kiện <code>messages</code>, <code>messaging_postbacks</code> của Webhook.</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div style={{ marginTop: '2.5rem', borderTop: '1px solid #E5E5EA', paddingTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    ⚡ Quản Lý Phím Tắt Trả Lời Nhanh (Macros / Snippets)
                  </h3>
                  <p style={{ color: '#86868B', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                    Tạo các mẫu tin nhắn soạn sẵn. Nhân viên có thể gõ phím tắt `/` trong khung chat để tự động điền nhanh câu trả lời mẫu.
                  </p>

                  {/* List of existing macros */}
                  {macros.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                      {macros.map((m, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#F5F5F7', borderRadius: '10px', border: '1px solid #E5E5EA' }}>
                          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-color)', fontSize: '0.9rem', backgroundColor: '#E1EFFF', padding: '2px 8px', borderRadius: '6px' }}>
                              {m.shortcut}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: '#323235', lineHeight: '1.4' }}>{m.text}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMacro(idx)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#FF3B30',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: '4px 8px'
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#F5F5F7', borderRadius: '10px', color: '#86868B', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                      Chưa có câu trả lời nhanh nào được cấu hình.
                    </div>
                  )}

                  {/* Add Macro Form */}
                  <div style={{ backgroundColor: '#F9FCFF', border: '1px solid #D2E9FF', borderRadius: '12px', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#102A43', margin: '0 0 1rem 0' }}>➕ Thêm câu trả lời nhanh mới</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2.2fr auto', gap: '12px', alignItems: 'end' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Phím tắt (bắt đầu bằng /):</label>
                        <input
                          type="text"
                          value={newShortcut}
                          onChange={e => setNewShortcut(e.target.value)}
                          placeholder="e.g. /payment"
                          style={{ height: '36px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 8px', width: '100%', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Nội dung tin nhắn thay thế:</label>
                        <input
                          type="text"
                          value={newText}
                          onChange={e => setNewText(e.target.value)}
                          placeholder="Nhập nội dung mẫu câu trả lời..."
                          style={{ height: '36px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', width: '100%', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddMacro}
                        disabled={savingMacros || !newShortcut || !newText}
                        style={{
                          height: '36px',
                          backgroundColor: '#34C759',
                          color: '#FFF',
                          border: 'none',
                          padding: '0 16px',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          opacity: (!newShortcut || !newText) ? 0.6 : 1
                        }}
                      >
                        {savingMacros ? 'Đang lưu...' : 'Thêm Mẫu'}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid #F5F5F7', paddingTop: '1.5rem' }}>
                  <button
                    type="submit"
                    className="btn-save"
                    disabled={savingOmnichannel}
                    style={{ width: '100%', height: '46px', fontWeight: 600, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem' }}
                  >
                    {savingOmnichannel ? 'Đang lưu cấu hình...' : <><FiSave /> Lưu Cấu Hướng Đấu Nối & Đa Kênh</>}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 2. CÁC CẤU HÌNH KHÁC (Submenus as Premium Cards at the Bottom) */}
      {!activeTab && (
        <div style={{ marginTop: '3.5rem', borderTop: '1px solid #E5E5EA', paddingTop: '2.5rem', marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1D1D1F', marginBottom: '1.25rem' }}>Các cấu hình khác</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          
          {/* Card: Thương hiệu */}
          <div 
            onClick={() => setSearchParams({ tab: 'general' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              backgroundColor: '#FFF',
              border: activeTab === 'general' ? '2px solid var(--primary-color)' : '1px solid #E5E5EA',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'general' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = activeTab === 'general' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ backgroundColor: '#E3F2FD', color: '#0071E3', padding: '10px', borderRadius: '10px', display: 'flex', flexShrink: 0 }}>
                <FiGlobe size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', color: '#1D1D1F' }}>Thương hiệu</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Tuỳ chỉnh logo, thông tin doanh nghiệp, múi giờ</span>
              </div>
            </div>
            <FiChevronRight style={{ color: '#86868B', marginLeft: '8px', flexShrink: 0 }} />
          </div>

          {/* Card: Bảo mật */}
          <div 
            onClick={() => setSearchParams({ tab: 'account' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              backgroundColor: '#FFF',
              border: activeTab === 'account' ? '2px solid var(--primary-color)' : '1px solid #E5E5EA',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'account' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = activeTab === 'account' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ backgroundColor: '#EBF9EB', color: '#34C759', padding: '10px', borderRadius: '10px', display: 'flex', flexShrink: 0 }}>
                <FiShield size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', color: '#1D1D1F' }}>Bảo mật</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Quản lý chính sách mật khẩu, tài khoản admin</span>
              </div>
            </div>
            <FiChevronRight style={{ color: '#86868B', marginLeft: '8px', flexShrink: 0 }} />
          </div>

          {/* Card: Tích hợp & Đa kênh */}
          <div 
            onClick={() => setSearchParams({ tab: 'omnichannel' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              backgroundColor: '#FFF',
              border: activeTab === 'omnichannel' ? '2px solid var(--primary-color)' : '1px solid #E5E5EA',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'omnichannel' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = activeTab === 'omnichannel' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ backgroundColor: '#FAF5FE', color: '#AF52DE', padding: '10px', borderRadius: '10px', display: 'flex', flexShrink: 0 }}>
                <FiMessageSquare size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', color: '#1D1D1F' }}>Tích hợp</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Cấu hình API Keys, Chatbot, Webhooks và Macros</span>
              </div>
            </div>
            <FiChevronRight style={{ color: '#86868B', marginLeft: '8px', flexShrink: 0 }} />
          </div>

          {/* Card: Cấu hình AI */}
          <div 
            onClick={() => setSearchParams({ tab: 'omnichannel' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              backgroundColor: '#FFF',
              border: '1px solid #E5E5EA',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ backgroundColor: '#FFF3E0', color: '#FF9500', padding: '10px', borderRadius: '10px', display: 'flex', flexShrink: 0 }}>
                <FiGrid size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', color: '#1D1D1F' }}>Cấu hình AI</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Thiết lập AI Assistant, prompt thông minh, tự động trả lời</span>
              </div>
            </div>
            <FiChevronRight style={{ color: '#86868B', marginLeft: '8px', flexShrink: 0 }} />
          </div>

          {/* Card: Cấu hình SMTP */}
          <div 
            onClick={() => setSearchParams({ tab: 'smtp' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              backgroundColor: '#FFF',
              border: activeTab === 'smtp' ? '2px solid var(--primary-color)' : '1px solid #E5E5EA',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'smtp' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = activeTab === 'smtp' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ backgroundColor: '#F2F7FD', color: '#0071E3', padding: '10px', borderRadius: '10px', display: 'flex', flexShrink: 0 }}>
                <FiMail size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', color: '#1D1D1F' }}>Cấu hình SMTP</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Cài đặt Email Server gửi thông báo hóa đơn, nhắc nợ</span>
              </div>
            </div>
            <FiChevronRight style={{ color: '#86868B', marginLeft: '8px', flexShrink: 0 }} />
          </div>

          {/* Card: Chuyển khoản (VietQR) */}
          <div 
            onClick={() => setSearchParams({ tab: 'bank' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              backgroundColor: '#FFF',
              border: activeTab === 'bank' ? '2px solid var(--primary-color)' : '1px solid #E5E5EA',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'bank' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = activeTab === 'bank' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ backgroundColor: '#EBF9EB', color: '#34C759', padding: '10px', borderRadius: '10px', display: 'flex', flexShrink: 0 }}>
                <FiCreditCard size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', color: '#1D1D1F' }}>Chuyển khoản (VietQR)</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Cấu hình tài khoản ngân hàng nhận thanh toán</span>
              </div>
            </div>
            <FiChevronRight style={{ color: '#86868B', marginLeft: '8px', flexShrink: 0 }} />
          </div>

          {/* Card: Mẫu hóa đơn PDF */}
          <div 
            onClick={() => setSearchParams({ tab: 'invoice' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              backgroundColor: '#FFF',
              border: activeTab === 'invoice' ? '2px solid var(--primary-color)' : '1px solid #E5E5EA',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'invoice' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = activeTab === 'invoice' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ backgroundColor: '#FAF5FE', color: '#AF52DE', padding: '10px', borderRadius: '10px', display: 'flex', flexShrink: 0 }}>
                <FiFileText size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', color: '#1D1D1F' }}>Mẫu hóa đơn PDF</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Tùy chỉnh giao diện tiêu đề, chữ ký hóa đơn</span>
              </div>
            </div>
            <FiChevronRight style={{ color: '#86868B', marginLeft: '8px', flexShrink: 0 }} />
          </div>

          {/* Card: Cấu hình gia hạn */}
          <div 
            onClick={() => setSearchParams({ tab: 'renewal' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              backgroundColor: '#FFF',
              border: activeTab === 'renewal' ? '2px solid var(--primary-color)' : '1px solid #E5E5EA',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'renewal' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = activeTab === 'renewal' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ backgroundColor: '#FFF3E0', color: '#FF9500', padding: '10px', borderRadius: '10px', display: 'flex', flexShrink: 0 }}>
                <FiClock size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', color: '#1D1D1F' }}>Cấu hình gia hạn</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Quản lý số ngày nhắc nợ và thời gian khóa tài nguyên</span>
              </div>
            </div>
            <FiChevronRight style={{ color: '#86868B', marginLeft: '8px', flexShrink: 0 }} />
          </div>

          {/* Card: Mẫu Email */}
          <div 
            onClick={() => setSearchParams({ tab: 'email-templates' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              backgroundColor: '#FFF',
              border: activeTab === 'email-templates' ? '2px solid var(--primary-color)' : '1px solid #E5E5EA',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'email-templates' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = activeTab === 'email-templates' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ backgroundColor: '#F2F7FD', color: '#0071E3', padding: '10px', borderRadius: '10px', display: 'flex', flexShrink: 0 }}>
                <FiMail size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', color: '#1D1D1F' }}>Mẫu Email</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Tự động soạn sẵn email gửi bàn giao, nhắc nợ</span>
              </div>
            </div>
            <FiChevronRight style={{ color: '#86868B', marginLeft: '8px', flexShrink: 0 }} />
          </div>

          {/* Card: Sao lưu dữ liệu */}
          <div 
            onClick={() => setSearchParams({ tab: 'backup' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              backgroundColor: '#FFF',
              border: activeTab === 'backup' ? '2px solid var(--primary-color)' : '1px solid #E5E5EA',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'backup' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = activeTab === 'backup' ? '0 4px 15px rgba(0, 113, 227, 0.1)' : 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ backgroundColor: '#EBF9EB', color: '#34C759', padding: '10px', borderRadius: '10px', display: 'flex', flexShrink: 0 }}>
                <FiDownloadCloud size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', color: '#1D1D1F' }}>Sao lưu dữ liệu</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Xuất và phục hồi dữ liệu hệ thống dự phòng</span>
              </div>
            </div>
            <FiChevronRight style={{ color: '#86868B', marginLeft: '8px', flexShrink: 0 }} />
          </div>

        </div>
      </div>
      )}

    </div>
  );
};

export default CaiDat;


