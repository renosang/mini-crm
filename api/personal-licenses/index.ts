import dbConnect from '../_lib/dbConnect.ts';
import PersonalLicense from '../_models/PersonalLicense.ts';

export default async function handler(req: any, res: any) {
  await dbConnect();
  
  const id = req.query.id || req.params?.id;
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          const item = await PersonalLicense.findById(id);
          if (!item) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bản quyền cá nhân' });
          }
          return res.status(200).json({ success: true, data: item });
        }
        
        const list = await PersonalLicense.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: list });
      } catch (err: any) {
        res.status(500).json({ success: false, message: 'Lỗi tải bản quyền cá nhân', error: err.message });
      }
      break;

    case 'POST':
      try {
        const item = await PersonalLicense.create(req.body);
        res.status(201).json({ success: true, data: item });
      } catch (err: any) {
        res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', error: err.message });
      }
      break;

    case 'PUT':
      try {
        if (!id) {
          return res.status(400).json({ success: false, message: 'Thiếu ID bản quyền cá nhân' });
        }
        const updated = await PersonalLicense.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true
        });
        if (!updated) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy bản quyền cá nhân' });
        }
        res.status(200).json({ success: true, data: updated });
      } catch (err: any) {
        res.status(400).json({ success: false, message: 'Lỗi cập nhật', error: err.message });
      }
      break;

    case 'DELETE':
      try {
        if (!id) {
          return res.status(400).json({ success: false, message: 'Thiếu ID bản quyền cá nhân' });
        }
        const deleted = await PersonalLicense.findByIdAndDelete(id);
        if (!deleted) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy bản quyền cá nhân' });
        }
        res.status(200).json({ success: true, data: {} });
      } catch (err: any) {
        res.status(500).json({ success: false, message: 'Lỗi xóa bản quyền cá nhân', error: err.message });
      }
      break;

    default:
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
      break;
  }
}
