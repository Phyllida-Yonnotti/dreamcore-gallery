// api/upload.js
import { createClient } from '@supabase/supabase-js';

// 1. 初始化 Supabase 客户端（Vercel 已经自动帮你配好了这两个环境变量）
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 2. 核心安全辅助：将明文密码转化为不可逆的 SHA-256 哈希值
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req, res) {
    // 只允许 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, username, password, caption, fileName, fileContent } = req.body;
    const token = process.env.GH_TOKEN;
    const repo = process.env.GH_REPO;

    if (!username || !password) {
        return res.status(400).json({ error: '字段不能为空' });
    }

    try {
        // 将前端传来的密码立刻变成哈希乱码，确保传输后也是安全的
        const hashedPassword = await hashPassword(password);

        // =================【 动作一：自主注册 】=================
        if (action === 'register') {
            // 检查用户名是否已存在于 Supabase
            const { data: existingUser } = await supabase.from('dc_users').select('*').eq('username', username).single();
            if (existingUser) {
                return res.status(400).json({ error: '该用户名已被占用。' });
            }

            // 写入 Supabase 数据库
            const { error: regError } = await supabase.from('dc_users').insert([{ username, password_hash: hashedPassword }]);
            if (regError) throw new Error(regError.message);

            return res.status(200).json({ success: true, message: '安全注册成功' });
        }

        // =================【 动作二：登录并上传 】=================
        if (action === 'upload') {
            // 🔒 身份验证：去 Supabase 捞人
            const { data: user, error: loginError } = await supabase.from('dc_users').select('*').eq('username', username).eq('password_hash', hashedPassword).single();
            if (loginError || !user) {
                return res.status(401).json({ error: '身份效验失败：用户名或密码错误。' });
            }

            // 💾 照片文件安全上传到 GitHub 充当免费图床
            const imagePath = `images/img_${Date.now()}_${fileName}`;
            const imgRes = await fetch(`https://api.github.com/repos/${repo}/contents/${imagePath}`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Upload by [${username}]`, content: fileContent })
            });
            if (!imgRes.ok) throw new Error("图片注入矩阵失败");

            // 📝 更新 GitHub 的 data.json 账本
            const jsonUrl = `https://api.github.com/repos/${repo}/contents/data.json`;
            const getJson = await fetch(jsonUrl, { headers: { 'Authorization': `token ${token}` } });
            let dataSha = "";
            let currentData = [];
            
            if (getJson.ok) {
                const jsonMeta = await getJson.json();
                dataSha = jsonMeta.sha;
                currentData = JSON.parse(Buffer.from(jsonMeta.content, 'base64').toString('utf-8'));
            }

            // 将新记录塞进列表最前面，并带上是谁传的标签
            currentData.unshift({ url: imagePath, text: caption, by: username });

            const updatedDataContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64');
            
            const updateJson = await fetch(jsonUrl, {
                method: 'PUT',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Database updated by ${username}`, content: updatedDataContent, sha: dataSha })
            });
            if (!updateJson.ok) throw new Error("GitHub 账本更新失败");

            return res.status(200).json({ success: true });
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}