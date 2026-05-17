import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="font-serif text-7xl text-gold mb-6 leading-none">
          404
        </div>
        <h1 className="text-3xl mb-3">Page not found</h1>
        <p className="text-ink mb-8 leading-relaxed">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
