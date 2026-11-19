import { Section } from "@/components/ui";
import { ProductDetailsSkeleton } from "../ProductDetailsSkeleton";

export default function Loading() {
  return (
    <Section className="pb-28">
      <div aria-hidden="true" className="mb-5 h-7 w-32 animate-pulse rounded-full bg-line/50 motion-reduce:animate-none" />
      <ProductDetailsSkeleton />
    </Section>
  );
}
