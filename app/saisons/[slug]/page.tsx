import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "../../components/icons";
import { loadProductDetail } from "@/lib/seasons";
import { ProductDetail } from "../product-detail";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await loadProductDetail(slug, undefined);
  return { title: data ? `${data.product.name} · Saisons` : "Produit introuvable" };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await loadProductDetail(slug, str(sp.m));
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-[640px] animate-fade-up px-[18px] py-8 sm:px-8">
      <Link
        href={`/saisons?m=${data.month}`}
        className="inline-flex items-center gap-2 py-1.5 text-[15px] font-semibold text-ink-soft transition hover:text-accent"
      >
        <Icon name="back" size={18} /> Retour au calendrier
      </Link>
      <div className="mt-4 overflow-hidden rounded-card border border-line-soft bg-surface shadow-card">
        <ProductDetail
          product={data.product}
          status={data.status}
          imageUrl={data.imageUrl}
          month={data.month}
          recipes={data.recipes}
        />
      </div>
    </main>
  );
}
