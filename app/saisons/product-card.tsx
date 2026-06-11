import Link from "next/link";
import { RecipePhoto } from "../components/recipe-ui";
import { CarbonBadge, CategoryBadge, SeasonBar, SeasonStatePill } from "./product-ui";
import { seasonState, type Produce } from "@/lib/seasons-data";

export function ProductCard({
  product,
  month,
  imageUrl,
}: {
  product: Produce;
  month: number;
  imageUrl: string | null;
}) {
  const status = seasonState(product.months, month);
  const off = status === "hors";

  return (
    <Link
      href={`/saisons/${product.slug}?m=${month}`}
      className={`group relative flex flex-col overflow-hidden rounded-card border border-line-soft bg-surface shadow-card transition duration-200 hover:-translate-y-1 hover:border-line hover:shadow-card-lg ${
        off ? "opacity-60 hover:opacity-100" : ""
      }`}
    >
      <div className="relative aspect-[4/3]">
        <RecipePhoto
          imageUrl={imageUrl}
          title={product.name}
          label={product.category}
          hue={product.hue}
        />
        <CategoryBadge category={product.category} className="absolute left-2.5 top-2.5 z-[2]" />
      </div>
      <div className="flex flex-col gap-2.5 px-3.5 pb-4 pt-3.5">
        <h3 className="font-display text-[17px] font-semibold leading-tight">{product.name}</h3>
        <div className="flex items-center justify-between gap-2">
          <SeasonStatePill status={status} />
          <CarbonBadge ecv={product.ecv} />
        </div>
        <SeasonBar months={product.months} current={month} />
      </div>
    </Link>
  );
}
