// api/upload.js (运行在 Vercel 云端的后端代码)
export default async function handler(req, res) {
    // 只允许 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { password, caption, fileName, fileContent } = req.body;

    // 1. 验证密码（对比你在 Vercel 设置的密码）
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: '暗号错误，拒绝入侵。' });
    }

    const token = process.env.GH_TOKEN;
    const repo = process.env.GH_REPO;

    try {
        // 2. 上传图片到 GitHub
        const imagePath = `images/img_${Date.now()}_${fileName}`;
        const imgRes = await fetch(`https://api.github.com/repos/${repo}/contents/${imagePath}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Upload via Admin: ${fileName}`, content: fileContent })
        });

        if (!imgRes.ok) throw new Error("图片注入矩阵失败");

        // 3. 更新 data.json 账本
        const jsonUrl = `https://api.github.com/repos/${repo}/contents/data.json`;
        const getJson = await fetch(jsonUrl, { headers: { 'Authorization': `token ${token}` } });
        
        let sha = "";
        let currentData = [];
        if (getJson.ok) {
            const jsonMeta = await getJson.json();
            sha = jsonMeta.sha;
            currentData = JSON.parse(Buffer.from(jsonMeta.content, 'base64').toString('utf-8'));
        }

        currentData.unshift({ url: imagePath, text: caption });

        const updatedContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64');
        
        const updateJson = await fetch(jsonUrl, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Update database`, content: updatedContent, sha })
        });

        if (!updateJson.ok) throw new Error("账本更新失败");

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}