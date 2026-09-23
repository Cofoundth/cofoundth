import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="font-serif text-num3 text-gold-ink mb-6">
          404
        </div>
        <h1 className="text-d2 mb-3">Page not found</h1>
        <p className="text-ink mb-8 leading-relaxed">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </p>
        <LinkButton href="/">Back to home</LinkButton>
      </div>
    </div>
  );
}
