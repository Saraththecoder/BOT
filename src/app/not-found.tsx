import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#f4f6f2] dark:bg-[#0f1411] text-[#1a1e1b] dark:text-[#f0f4f1]">
      <img src="/logo.png" alt="aitsbot.ai Logo" className="w-20 h-20 mb-6 object-contain" />
      <h1 className="font-display text-6xl font-normal mb-2">404</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mb-8">
        The page or resource you are looking for could not be found.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-full bg-[#2b5944] text-white font-medium hover:bg-[#224736] transition-all shadow-md"
      >
        Return to aitsbot.ai Home
      </Link>
    </div>
  );
}
