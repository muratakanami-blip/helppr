import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'DLE 広報プレスリリース生成ツール',
  description: '株式会社ディー・エル・イー 広報部専用 AIプレスリリース自動生成・Google Drive連携ツール',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased text-[#1a1a1a]">
        {children}
        {/* Google Identity Services (GIS) library for secure Google OAuth Sign-in */}
        <Script 
          src="https://accounts.google.com/gsi/client" 
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
