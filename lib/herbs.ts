// Aromatic-herb seasonality. The ADEME "fruits et légumes" dataset doesn't
// cover culinary herbs, and there's no maintained French open-data API for them,
// so this is a committed dataset (open-field / "plein champ" months, from
// agronomic sources such as French chambres d'agriculture / Etiquettable).
// Merged at runtime with the ADEME produce in getProduce(). Herbs carry no
// reliable carbon footprint, hence ecv: null. Server-only (pulls in Zod).

import { z } from "zod";
import herbsJson from "@/lib/data/herbs-seasonality.json";
import { hueForSlug, type Produce } from "@/lib/seasons-data";

const HerbSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  months: z.array(z.number().int().min(1).max(12)).min(1),
});

// Validated at module load: a malformed data file fails fast on the server.
const herbs = z.array(HerbSchema).parse(herbsJson);

/** Aromatic herbs as Produce (category "herbes", no carbon data). */
export const HERBS: Produce[] = herbs.map((h) => ({
  name: h.name,
  slug: h.slug,
  months: h.months,
  ecv: null,
  category: "herbes",
  hue: hueForSlug(h.slug),
}));
