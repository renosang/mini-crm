// Script test IMAP độc lập - chạy trên VPS: tsx test-imap.ts
import mongoose from 'mongoose';
import Setting from './api/_models/Setting.ts';
import Imap from 'imap';
import { simpleParser } from 'mailparser';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mini-crm';

async function main() {
    console.log('🔌 Kết nối MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    console.log('🔍 Đọc cấu hình IMAP từ database...');
    const setting = await Setting.findOne({ key: 'imap' });
    if (!setting?.value) { console.log('❌ Chưa có cấu hình IMAP trong DB. Vui lòng vào Mailbox -> Cấu hình IMAP để lưu.'); process.exit(1); }

    const cfg = setting.value;
    console.log('   Host:', cfg.host, 'Port:', cfg.port);
    console.log('   User:', cfg.user);
    console.log('   Password:', cfg.password ? '**** (đã có)' : 'TRỐNG!');

    if (!cfg.password) { console.log('❌ App Password bị trống!'); process.exit(1); }

    console.log('\n📡 Đang kết nối IMAP...');
    const imap = new Imap({
        user: cfg.user,
        password: cfg.password,
        host: cfg.host || 'imap.gmail.com',
        port: Number(cfg.port) || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 10000,
        authTimeout: 10000,
    });

    imap.once('ready', () => {
        console.log('✅ IMAP connected!');
        imap.openBox('INBOX', false, (err: any, box: any) => {
            if (err) { console.log('❌ openBox error:', err.message); imap.end(); process.exit(1); }
            console.log('📬 INBOX opened:', box.messages.total, 'messages');
            console.log('   Total:', box.messages.total, '| New:', box.messages.new, '| Unseen:', box.messages.unseen);

            console.log('\n🔍 Searching ALL messages...');
            imap.search(['ALL'], (err2: any, results: any) => {
                if (err2) { console.log('❌ search error:', err2.message); imap.end(); process.exit(1); }
                console.log('   Found', results?.length || 0, 'message IDs');

                if (!results || !results.length) { console.log('⚠️  Không có mail nào!'); imap.end(); process.exit(0); }

                const latest = results.slice(-3);
                console.log('📥 Fetching', latest.length, 'most recent messages...');
                const fetch = imap.fetch(latest, { bodies: '' });

                fetch.on('message', (msg: any, seqno: number) => {
                    console.log('\n   📧 Message seqno:', seqno);
                    let body = '';
                    msg.on('body', (stream: any) => { let b = ''; stream.on('data', (c: any) => b += c.toString('utf8')); stream.once('end', () => body = b); });
                    msg.once('end', async () => {
                        try {
                            const parsed = await simpleParser(body);
                            console.log('      From:', parsed.from?.text);
                            console.log('      Subject:', parsed.subject);
                            console.log('      Message-ID:', parsed.messageId);
                            console.log('      Date:', parsed.date);
                            console.log('      Body preview:', (parsed.text || '').substring(0, 100));
                        } catch (e: any) { console.log('      ❌ Parse error:', e.message); }
                    });
                });

                fetch.once('end', () => {
                    console.log('\n✅ Done fetching. Closing connection...');
                    imap.end();
                    process.exit(0);
                });
            });
        });
    });

    imap.once('error', (err: any) => {
        console.log('❌ IMAP error:', err.message || err);
        console.log('   Full error:', JSON.stringify(err, null, 2));
        process.exit(1);
    });

    imap.connect();

    setTimeout(() => { console.log('⏰ Timeout 15s - có thể port 993 bị chặn hoặc DNS sai'); process.exit(1); }, 15000);
}

main().catch(e => { console.log('❌ Fatal:', e.message); process.exit(1); });