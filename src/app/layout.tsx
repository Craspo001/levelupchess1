import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css'; // Global styles

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'LevelUpChess | Master Your Openings',
  description: 'Level up your chess openings with interactive training and AI coaching.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Openings', href: '/openings' },
    { name: 'Train', href: '/train' },
    { name: 'Coach', href: '/coach' },
    { name: 'Profile', href: '/profile' },
  ];

  return (
    <html lang="en" className={`${inter.variable}`}>
      <body suppressHydrationWarning className="bg-slate-950 text-slate-50 font-sans min-h-screen flex flex-col">
        {/* Navbar */}
        <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight text-blue-400 hover:text-blue-300 transition-colors">
              LevelUpChess
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="md:hidden">
              {/* Mobile menu button could go here */}
              <button className="p-2 text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-slate-900">
          <div className="container mx-auto px-4 text-center">
            <p className="text-xs text-slate-500 opacity-60 font-medium tracking-wide">
              Powered by BeebTeq
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
