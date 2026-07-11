import dbConnect from '../_lib/dbConnect.ts';
import Quotation from '../_models/Quotation.ts';

export default async function handler(req: any, res: any) {
    const token = req.query.t;
    const redirect = req.query.r || '/';
    if (!token) { res.redirect(redirect); return; }
    await dbConnect();
    await Quotation.updateOne(
        { tracking_token: token },
        { email_clicked_at: new Date(), status: 'confirmed' }
    );
    res.redirect(redirect);
}