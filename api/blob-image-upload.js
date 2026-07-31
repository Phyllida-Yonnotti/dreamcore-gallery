// api/get-thai-images.js
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    // 1. 扫描 Vercel Blob 中前缀为 'thai/' 的所有文件
    const { blobs } = await list({ prefix: 'thai/' });

    // 2. 提取出所有图片的完整 CDN URL 地址
    const imageUrls = blobs.map(blob => blob.url);

    // 3. 返回 JSON 数据给前端网页
    return res.status(200).json({ success: true, images: imageUrls });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}