import type { MetadataRoute } from "next";

// Web app manifest (PWA): provides the Android/Chrome install icons, name and
// theme colors. Next serves this at /manifest.webmanifest and links it.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sur le Plat — Recettes maison",
    short_name: "Sur le Plat",
    description:
      "Toutes vos recettes dans une même coquille : recherchez, consultez et créez vos recettes maison.",
    start_url: "/recettes",
    display: "standalone",
    background_color: "#f3ecd8",
    theme_color: "#151517",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
