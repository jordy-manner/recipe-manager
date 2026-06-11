import { notFound } from "next/navigation";
import { loadProductDetail } from "@/lib/seasons";
import { ProductDetail } from "../../product-detail";
import { ProductModal } from "../../product-modal";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Intercepts /saisons/[slug] when navigated from /saisons → shows it as a drawer.
export default async function InterceptedProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await loadProductDetail(slug, str(sp.m));
  if (!data) notFound();

  return (
    <ProductModal>
      <ProductDetail
        product={data.product}
        status={data.status}
        imageUrl={data.imageUrl}
        month={data.month}
        recipes={data.recipes}
      />
    </ProductModal>
  );
}
