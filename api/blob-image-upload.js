// api/blob-image-upload.js
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    // 扫描 Vercel Blob 中 thai/ 目录下的所有文件
    const { blobs } = await list({ prefix: 'thai/' });

    // 提取所有图片的 CDN 链接
    const imageUrls = blobs.map(blob => blob.url);

    return res.status(200).json({ success: true, images: imageUrls });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}