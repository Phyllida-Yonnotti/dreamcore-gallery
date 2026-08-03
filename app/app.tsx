'use client';

import { useState, useEffect, useRef } from 'react';
import type { PutBlobResult } from '@vercel/blob';

interface Memory {
  url: string;
  text: string;
}

export default function Home() {
  // 状态管理
  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [uploadStatus, setUploadStatus] = useState('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  // 初始化获取图片列表
  const loadThaiGallery = async () => {
    try {
      const res = await fetch('/api/blob-image-upload');
      const data = await res.json();

      if (data.success && data.images.length > 0) {
        const loadedMemories = data.images.map((url: string) => ({
          url,
          text: '这是你醒来前看到的最后一幕。',
        }));
        setMemories(loadedMemories);
      }
    } catch (err) {
      console.error('加载图片失败:', err);
    }
  };

  useEffect(() => {
    loadThaiGallery();
  }, []);

  // 记忆切换控制
  const changeMemory = (direction: number) => {
    if (memories.length === 0) return;
    let nextIndex = currentIndex + direction;
    if (nextIndex >= memories.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = memories.length - 1;
    setCurrentIndex(nextIndex);
  };

  // 背景音乐控制
  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (!isPlaying) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        if (audioRef.current) audioRef.current.playbackRate = 0.85;
      }).catch(err => console.log('播放受阻:', err));
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // 图片上传逻辑 (即你贴出的上传代码)
  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!inputFileRef.current?.files?.[0]) {
      alert('请选择要上传的文件！');
      return;
    }

    const file = inputFileRef.current.files[0];
    setUploadStatus('正在上传...');

    try {
      const response = await fetch(
        `/api/avatar/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          body: file,
        }
      );

      const newBlob = (await response.json()) as PutBlobResult;
      setUploadStatus('上传成功！');
      
      // 重新加载画廊
      await loadThaiGallery();
    } catch (error) {
      console.error('Upload Error:', error);
      setUploadStatus('上传失败');
    }
  };

  return (
    <main>
      {/* 1. 开场遮罩层 */}
      {splashVisible && (
        <div
          id="splash-screen"
          className="splash-screen"
          onClick={() => setSplashVisible(false)}
        >
          {/* 这里换上你 Public Blob 里的图片 CDN 链接 */}
          <img
            src="https://<YOUR-PUBLIC-BLOB-STORE>.public.blob.vercel-storage.com/iron-gate.jpg"
            alt="Iron Gate Intro"
            className="splash-img"
          />
        </div>
      )}

      {/* 2. 背景音乐 */}
      {/* 这里换上你 Public Blob 里的音频 CDN 链接 */}
      <audio
        ref={audioRef}
        src="https://<YOUR-PUBLIC-BLOB-STORE>.public.blob.vercel-storage.com/bgm.m4a"
        loop
      />

      <div className="dream-text">
        -----------<br />
        jisichong
      </div>

      {/* 3. 窗口容器 */}
      <div className="window-container">
        <div className="window-header">
          <span>Memory_Viewer.exe</span>
          <button className="window-close" onClick={() => alert('你无法逃离这里。')}>
            X
          </button>
        </div>

        <div className="window-body">
          <div className="photo-frame">
            <div id="gallery-container" className="gallery-grid">
              {memories.length > 0 ? (
                <img
                  id="gallery"
                  src={memories[currentIndex]?.url}
                  alt="Memory Image"
                  className="gallery-img"
                  style={{ transition: 'opacity 0.15s', opacity: 1 }}
                />
              ) : (
                <p className="loading-text">正在提取记忆碎片...</p>
              )}
            </div>
            <div className="photo-caption">
              {memories[currentIndex]?.text || '这是你醒来前看到的最后一幕。'}
            </div>
          </div>

          <div className="nav-buttons">
            <button className="btn" onClick={() => changeMemory(-1)}>◀ 上一段</button>
            <button className="btn" onClick={toggleMusic}>
              {isPlaying ? '⏸ 暂停声音' : '🎵 播放声音'}
            </button>
            <button className="btn" onClick={() => changeMemory(1)}>下一段 ▶</button>
          </div>

          {/* 4. 上传区域 */}
          <form onSubmit={handleUpload} style={{ marginTop: '20px', textAlign: 'center' }}>
            <input
              name="file"
              ref={inputFileRef}
              type="file"
              accept="image/jpeg, image/png, image/webp"
              required
            />
            <button type="submit" className="btn">上传新记忆</button>
            {uploadStatus && <p style={{ fontSize: '12px', marginTop: '5px' }}>{uploadStatus}</p>}
          </form>
        </div>
      </div>
    </main>
  );
}