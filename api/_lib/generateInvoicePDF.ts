import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import dbConnect from './dbConnect.ts';
import Setting from '../_models/Setting.ts';

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 2000 });
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Không thể tải hình ảnh từ URL: ${url}`, error);
    return null;
  }
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

// ─── Màu Burgundy/Wine — đỏ trầm sang trọng ─────────────────────────────────
const C = {
  sidebar: '#6B2737',  // đỏ rượu vang đậm
  sidebarAccent: '#4E1A27',  // accent tối trong sidebar
  tableHeader: '#7D3040',  // header bảng (nhẹ hơn sidebar 1 tông)
  rowAlt: '#FDF3F4',  // nền hàng xen kẽ (hồng rất nhạt)
  pageBg: '#FAFAFA',  // nền trang trắng xám
  accent: '#9B3647',  // màu nhấn chữ (đỏ vừa phải)
  textOnSide: '#F5D5DC',  // chữ mờ trên sidebar
  textWhite: '#FFFFFF',
  bodyText: '#1D1D1F',
  mutedText: '#86868B',
  border: '#E8E0E1',
  totalBg: '#FDF0F2',
  totalBorder: '#E8C0C8',
};

// ─── Hằng số bố cục A4 ───────────────────────────────────────────────────────
// Sidebar thẳng đứng (KHÔNG vát chéo) để tránh tràn nội dung
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const SB_W = 160;      // chiều rộng sidebar tuyệt đối
const SB_PAD = 18;       // padding trong sidebar
const CT_X = SB_W + 18; // tọa độ X bắt đầu vùng nội dung
const CT_RIGHT = PAGE_W - 18; // tọa độ X kết thúc vùng nội dung  
const CT_W = CT_RIGHT - CT_X; // = 595.28 - 18 - 178 = 399.28

/**
 * Sinh hóa đơn PDF — Burgundy Sidebar Layout, layout cố định đúng lề.
 */
export function generateInvoicePDF(
  customer: any,
  accounts: any[],
  totalAmount: number,
  isUnpaidInvoice: boolean,
  orderId?: string,
  isRenewal?: boolean,
  orderExtra?: any,
  passedBankInfo?: any,
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      let bankInfo = passedBankInfo;
      if (!bankInfo) {
        await dbConnect();
        const bankSetting = await Setting.findOne({ key: 'bank' });
        bankInfo = {
          bank_id: 'Sacombank',
          account_no: '060233251669',
          account_name: 'Nguyễn Thanh Sang',
          bank_name: 'Sacombank'
        };
        if (bankSetting && bankSetting.value) {
          bankInfo = { ...bankInfo, ...bankSetting.value };
        }
      }

      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const chunks: any[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // ── Fonts ──────────────────────────────────────────────────────────────
      const regularFont = path.join(process.cwd(), 'api/_fonts/Roboto-Regular.ttf');
      const boldFont = path.join(process.cwd(), 'api/_fonts/Roboto-Bold.ttf');
      if (fs.existsSync(regularFont)) doc.registerFont('Roboto-Regular', regularFont);
      if (fs.existsSync(boldFont)) doc.registerFont('Roboto-Bold', boldFont);
      const FN = fs.existsSync(regularFont) ? 'Roboto-Regular' : 'Helvetica';
      const FB = fs.existsSync(boldFont) ? 'Roboto-Bold' : 'Helvetica-Bold';
      doc.font(FN);

      // ═══════════════════════════════════════════════════════════════════════
      // PHẦN 1: NỀN
      // ═══════════════════════════════════════════════════════════════════════

      // Nền trang bên phải
      doc.rect(SB_W, 0, PAGE_W - SB_W, PAGE_H).fill(C.pageBg);

      // Sidebar trái — thẳng đứng hoàn toàn, đủ để tránh tràn
      doc.rect(0, 0, SB_W, PAGE_H).fill(C.sidebar);

      // Dải accent mỏng bên phải sidebar (tạo chiều sâu)
      doc.rect(SB_W - 5, 0, 5, PAGE_H).fill(C.sidebarAccent);

      // ═══════════════════════════════════════════════════════════════════════
      // PHẦN 2: NỘI DUNG SIDEBAR
      // ═══════════════════════════════════════════════════════════════════════
      const invNo = orderId ? `#${orderId.toString().substring(18).toUpperCase()}` : '#RETAIL';
      const dateStr = new Date().toLocaleDateString('vi-VN');

      // — Mã hóa đơn & ngày —
      // Icon tờ giấy
      doc.rect(SB_PAD, 40, 16, 20).lineWidth(1.2).strokeColor(C.textWhite).stroke();
      doc.moveTo(SB_PAD + 3, 47).lineTo(SB_PAD + 13, 47).strokeColor(C.textWhite).lineWidth(0.8).stroke();
      doc.moveTo(SB_PAD + 3, 51).lineTo(SB_PAD + 13, 51).stroke();
      doc.moveTo(SB_PAD + 3, 55).lineTo(SB_PAD + 9, 55).stroke();

      doc.font(FB).fontSize(9).fillColor(C.textWhite).text('Hoá đơn', SB_PAD, 68);
      doc.fontSize(12).text(invNo, SB_PAD, 80);
      doc.font(FN).fontSize(7.5).fillColor(C.textOnSide).text('Ngày phát hành:', SB_PAD, 99);
      doc.font(FB).fontSize(8.5).fillColor(C.textWhite).text(dateStr, SB_PAD, 110);

      doc.moveTo(SB_PAD, 130).lineTo(SB_W - SB_PAD, 130)
        .strokeColor('rgba(255,255,255,0.15)').lineWidth(0.5).stroke();

      // — Thông tin thanh toán —
      // Icon thẻ
      doc.roundedRect(SB_PAD, 143, 18, 12, 2)
        .lineWidth(1.2).strokeColor(C.textWhite).stroke();
      doc.moveTo(SB_PAD, 148).lineTo(SB_PAD + 18, 148).stroke();

      doc.font(FB).fontSize(7.5).fillColor(C.textWhite).text('THÔNG TIN THANH TOÁN', SB_PAD, 164);

      doc.font(FN).fontSize(7).fillColor(C.textOnSide).text('Ngân hàng:', SB_PAD, 180);
      doc.font(FB).fontSize(8).fillColor(C.textWhite)
        .text(bankInfo.bank_name, SB_PAD, 190, { width: SB_W - SB_PAD * 2 });

      doc.font(FN).fontSize(7).fillColor(C.textOnSide).text('Tên tài khoản:', SB_PAD, 212);
      doc.font(FB).fontSize(7.5).fillColor(C.textWhite)
        .text(bankInfo.account_name.toUpperCase(), SB_PAD, 222, { width: SB_W - SB_PAD * 2 });

      doc.font(FN).fontSize(7).fillColor(C.textOnSide).text('Số tài khoản:', SB_PAD, 248);
      doc.font(FB).fontSize(9).fillColor(C.textWhite).text(bankInfo.account_no, SB_PAD, 258);

      const orderNoStr = orderId ? orderId.toString().substring(18).toUpperCase() : 'RETAIL';
      doc.font(FN).fontSize(7).fillColor(C.textOnSide).text('Nội dung CK:', SB_PAD, 280);
      doc.font(FB).fontSize(7.5).fillColor(C.textWhite)
        .text(`TT DH #${orderNoStr}`, SB_PAD, 290, { width: SB_W - SB_PAD * 2 });

      doc.moveTo(SB_PAD, 312).lineTo(SB_W - SB_PAD, 312)
        .strokeColor('rgba(255,255,255,0.15)').lineWidth(0.5).stroke();

      // — QR Code —
      if (isUnpaidInvoice) {
        const addInfoStr = encodeURIComponent(`Thanh toan don hang ${invNo}`);
        const cleanBankId = bankInfo.bank_id.replace(/\s+/g, '');
        const cleanAccNo = bankInfo.account_no.replace(/\s+/g, '');
        const cleanAccName = encodeURIComponent(removeVietnameseTones(bankInfo.account_name).toUpperCase());
        const qrUrl = `https://img.vietqr.io/image/${cleanBankId}-${cleanAccNo}-compact2.png?amount=${totalAmount}&addInfo=${addInfoStr}&accountName=${cleanAccName}`;
        try {
          const qrBuffer = await fetchImageBuffer(qrUrl);
          if (qrBuffer) {
            const QR_SIZE = SB_W - SB_PAD * 2;  // 160 - 36 = 124px
            const QR_X = SB_PAD;
            const QR_Y = 322;
            doc.roundedRect(QR_X - 2, QR_Y - 2, QR_SIZE + 4, QR_SIZE + 4, 6).fill(C.textWhite);
            doc.image(qrBuffer, QR_X, QR_Y, { width: QR_SIZE, height: QR_SIZE });
            doc.font(FN).fontSize(7).fillColor(C.textOnSide)
              .text('Quét mã để thanh toán nhanh', 0, QR_Y + QR_SIZE + 8,
                { align: 'center', width: SB_W });
          }
        } catch (e) {
          console.error('VietQR error:', e);
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PHẦN 3: NỘI DUNG CHÍNH (CỘT PHẢI)
      // ═══════════════════════════════════════════════════════════════════════

      // — Logo (chỉ logo, không text, kích thước lớn) —
      const logoPath = path.join(process.cwd(), 'src/assets/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, CT_RIGHT - 55, 25, { height: 45 });
      }

      // — Tiêu đề —
      doc.font(FB).fontSize(22).fillColor(C.bodyText).text('HÓA ĐƠN', CT_X, 30);

      // — Badge trạng thái —
      let statusText = 'ĐÃ THANH TOÁN';
      let statusBg = '#EBF9EB';
      let statusFg = '#2E7D32';
      if (isUnpaidInvoice) {
        if (isRenewal) {
          statusText = 'CẦN GIA HẠN';
          statusBg = C.totalBg;
          statusFg = C.accent;
        } else {
          statusText = 'CHƯA THANH TOÁN';
          statusBg = '#FFF5E6';
          statusFg = '#C47000';
        }
      }
      doc.roundedRect(CT_X, 58, 115, 19, 5).fill(statusBg);
      doc.font(FB).fontSize(8).fillColor(statusFg)
        .text(statusText, CT_X, 64, { align: 'center', width: 115 });

      // — Thông tin khách hàng —
      doc.font(FB).fontSize(9.5).fillColor(C.accent).text('THÔNG TIN KHÁCH HÀNG', CT_X, 92);
      doc.moveTo(CT_X, 106).lineTo(CT_RIGHT, 106)
        .strokeColor(C.border).lineWidth(0.5).stroke();

      const L1 = 112; // dòng đầu thông tin khách hàng
      doc.font(FN).fontSize(8.5).fillColor(C.mutedText).text('Tên khách hàng:', CT_X, L1);
      doc.font(FB).fillColor(C.bodyText).text(customer.name, CT_X + 90, L1);
      doc.font(FN).fillColor(C.mutedText).text('Điện thoại:', CT_X, L1 + 14);
      doc.font(FB).fillColor(C.bodyText).text(customer.phone || 'N/A', CT_X + 90, L1 + 14);
      doc.font(FN).fillColor(C.mutedText).text('Email:', CT_X, L1 + 28);
      doc.font(FB).fillColor(C.bodyText).text(customer.email || 'N/A', CT_X + 90, L1 + 28);

      // ═══════════════════════════════════════════════════════════════════════
      // PHẦN 4: BẢNG DỊCH VỤ — layout tuyệt đối, tổng đúng bằng CT_W
      // ═══════════════════════════════════════════════════════════════════════
      const TABLE_TOP = L1 + 55;
      doc.font(FB).fontSize(8).fillColor(C.mutedText)
        .text('CHI TIẾT DỊCH VỤ / SERVICE DETAILS:', CT_X, TABLE_TOP);

      const TH_Y = TABLE_TOP + 14;
      const ROW_PAD = 7;
      const ROW_MIN = 22;
      let curY = TH_Y + 22;

      // Kiểm tra xem có accounts hay là đơn hàng sản phẩm tùy chỉnh
      const hasAccounts = accounts && accounts.length > 0;
      const hasCustomProduct = !hasAccounts && orderExtra && orderExtra.product_name;

      if (hasAccounts) {
        // ── BẢNG CHUẨN CHO ACCOUNTS ──
        const COLS = {
          svc: { x: CT_X, w: 140 },
          type: { x: CT_X + 140, w: 90 },
          valid: { x: CT_X + 230, w: 85 },
          amt: { x: CT_X + 315, w: CT_RIGHT - (CT_X + 315) },
        };

        doc.rect(CT_X, TH_Y, CT_W, 22).fill(C.tableHeader);
        doc.font(FB).fontSize(7.5).fillColor(C.textWhite);
        doc.text('DỊCH VỤ', COLS.svc.x + 5, TH_Y + 7, { width: COLS.svc.w - 5 });
        doc.text('PHÂN LOẠI', COLS.type.x + 3, TH_Y + 7, { width: COLS.type.w - 3 });
        doc.text('HẠN SỬ DỤNG', COLS.valid.x + 3, TH_Y + 7, { width: COLS.valid.w - 3 });
        doc.text('THÀNH TIỀN', COLS.amt.x, TH_Y + 7, { width: COLS.amt.w - 3, align: 'right' });

        const itemPrice = totalAmount / accounts.length;

        accounts.forEach((acc, idx) => {
          const pType = acc.product_type || 'Gói bản quyền';
          const rType = acc.resource_type === 'key' ? 'Key kích hoạt' : 'Tài khoản\n(ID:Pass)';
          const validStr = acc.valid_until
            ? new Date(acc.valid_until).toLocaleDateString('vi-VN')
            : 'Không giới hạn';
          const costStr = `${itemPrice.toLocaleString('vi-VN')} đ`;

          doc.font(FB).fontSize(8.5);
          const hSvc = doc.heightOfString(pType, { width: COLS.svc.w - 10 });
          doc.font(FN).fontSize(8.5);
          const hType = doc.heightOfString(rType, { width: COLS.type.w - 6 });
          const hVld = doc.heightOfString(validStr, { width: COLS.valid.w - 6 });
          const rowH = Math.max(ROW_MIN, hSvc, hType, hVld) + ROW_PAD * 2;

          doc.rect(CT_X, curY, CT_W, rowH).fill(idx % 2 === 0 ? '#FFFFFF' : C.rowAlt);
          doc.moveTo(CT_X, curY).lineTo(CT_RIGHT, curY).strokeColor(C.border).lineWidth(0.3).stroke();

          const ty = curY + ROW_PAD;
          doc.font(FB).fontSize(8.5).fillColor(C.bodyText).text(pType, COLS.svc.x + 5, ty, { width: COLS.svc.w - 10 });
          doc.font(FN).fillColor(C.bodyText).text(rType, COLS.type.x + 3, ty, { width: COLS.type.w - 6 });
          doc.text(validStr, COLS.valid.x + 3, ty, { width: COLS.valid.w - 6 });
          doc.font(FB).fillColor(C.accent).text(costStr, COLS.amt.x, ty, { width: COLS.amt.w - 3, align: 'right' });

          curY += rowH;
        });
      } else if (hasCustomProduct) {
        // ── BẢNG CHO SẢN PHẨM TÙY CHỈNH ──
        const pName = orderExtra.product_name || 'Sản phẩm';
        const qty = orderExtra.quantity || 1;
        const sellPrice = orderExtra.selling_price || 0;
        const costPrice = orderExtra.cost_price || 0;
        const expiryStr = orderExtra.expiry_date ? new Date(orderExtra.expiry_date).toLocaleDateString('vi-VN') : '—';

        // Header đơn giản: 2 cột
        const col1x = CT_X;
        const col1w = CT_W * 0.62;
        const col2x = col1x + col1w;
        const col2w = CT_W - col1w;

        doc.rect(CT_X, TH_Y, CT_W, 22).fill(C.tableHeader);
        doc.font(FB).fontSize(7.5).fillColor(C.textWhite);
        doc.text('THÔNG TIN', col1x + 5, TH_Y + 7, { width: col1w - 5 });
        doc.text('CHI TIẾT', col2x + 3, TH_Y + 7, { width: col2w - 3, align: 'right' });

        const rows: [string, string][] = [
          ['Sản phẩm', pName],
          ['Số lượng', String(qty)],
          ['Giá gốc', `${costPrice.toLocaleString('vi-VN')} đ`],
          ['Giá bán', `${sellPrice.toLocaleString('vi-VN')} đ`],
          ['Hạn sử dụng', expiryStr],
        ];
        if (orderExtra.discount_amount > 0) {
          rows.push(['Giảm giá', `-${orderExtra.discount_amount.toLocaleString('vi-VN')} đ`]);
        }
        if (orderExtra.recurring_invoice?.enabled) {
          const recStr = orderExtra.recurring_invoice.custom_interval || `Mỗi ${orderExtra.recurring_invoice.interval_months} tháng`;
          rows.push(['Hóa đơn định kỳ', recStr]);
        }
        const pmStr = orderExtra.payment_method === 'bank_transfer' ? 'Chuyển khoản' : orderExtra.payment_method === 'cash' ? 'Tiền mặt' : '—';
        rows.push(['Hình thức TT', pmStr]);
        if (orderExtra.customer_note) {
          rows.push(['Ghi chú', orderExtra.customer_note]);
        }

        rows.forEach(([label, value], idx) => {
          const rowH = Math.max(ROW_MIN, 16) + 6;
          doc.rect(CT_X, curY, CT_W, rowH).fill(idx % 2 === 0 ? '#FFFFFF' : C.rowAlt);
          doc.moveTo(CT_X, curY).lineTo(CT_RIGHT, curY).strokeColor(C.border).lineWidth(0.3).stroke();

          const ty = curY + ROW_PAD;
          doc.font(FB).fontSize(8.5).fillColor(C.mutedText).text(label, col1x + 5, ty, { width: col1w - 10 });
          doc.font(FB).fontSize(8.5).fillColor(C.bodyText).text(value, col2x + 3, ty, { width: col2w - 6, align: 'right' });

          curY += rowH;
        });
      }

      // Đường chân bảng
      doc.moveTo(CT_X, curY).lineTo(CT_RIGHT, curY)
        .strokeColor(C.tableHeader).lineWidth(1).stroke();

      // ═══════════════════════════════════════════════════════════════════════
      // PHẦN 5: TỔNG TIỀN
      // ═══════════════════════════════════════════════════════════════════════
      const TOT_Y = curY + 14;
      const TOT_W = 210;
      const TOT_X = CT_RIGHT - TOT_W;

      doc.roundedRect(TOT_X, TOT_Y, TOT_W, 50, 8).fill(C.totalBg);
      doc.roundedRect(TOT_X, TOT_Y, TOT_W, 50, 8)
        .strokeColor(C.totalBorder).lineWidth(0.7).stroke();

      const totalLabel = isUnpaidInvoice
        ? (isRenewal ? 'TỔNG TIỀN CẦN GIA HẠN:' : 'TỔNG TIỀN CẦN THANH TOÁN:')
        : 'TỔNG TIỀN ĐÃ THANH TOÁN:';
      doc.font(FN).fontSize(7.5).fillColor(C.mutedText)
        .text(totalLabel, TOT_X + 12, TOT_Y + 10);
      doc.font(FB).fontSize(14).fillColor(C.accent)
        .text(`${totalAmount.toLocaleString('vi-VN')} đ`, TOT_X + 12, TOT_Y + 26,
          { width: TOT_W - 20 });

      // ═══════════════════════════════════════════════════════════════════════
      // PHẦN 6: FOOTER
      // ═══════════════════════════════════════════════════════════════════════
      const FOOT_Y = PAGE_H - 62;
      doc.moveTo(CT_X, FOOT_Y - 8).lineTo(CT_RIGHT, FOOT_Y - 8)
        .strokeColor(C.border).lineWidth(0.5).stroke();

      doc.font(FB).fontSize(9).fillColor(C.accent).text('BEEGADGET.NET', CT_X, FOOT_Y);
      doc.font(FN).fontSize(7.5).fillColor(C.mutedText)
        .text('Hotline: 0962979214  |  Email: renosang@gmail.com', CT_X, FOOT_Y + 13);
      doc.text('© 2026 Beegadget.net. All rights reserved.', CT_X, FOOT_Y + 25);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
