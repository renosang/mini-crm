import dbConnect from '../_lib/dbConnect.ts';
import Quotation from '../_models/Quotation.ts';

export default async function handler(req: any, res: any) {
    const token = req.query.t;
    if (!token) { res.status(200).end(); return; }
    await dbConnect();
    await Quotation.updateOne(
        { tracking_token: token, email_opened_at: null },
        { email_opened_at: new Date(), status: 'viewed' }
    );
    res.writeHead(200, { 'Content-Type': 'image/gif' });
    res.end(Buffer.alloc(43));
}