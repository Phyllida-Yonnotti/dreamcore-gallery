///css
import './globals.css';
export const metadata = {
  title: 'Is this a dream?',
  description: 'Memory Viewer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}