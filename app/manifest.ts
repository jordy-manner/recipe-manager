import type { MetadataRoute } from "next";

// Web app manifest (PWA): provides the Android/Chrome install icons, name and
// theme colors. Next serves this at /manifest.webmanifest and links it.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mealoday — Recettes maison",
    short_name: "Mealoday",
    description:
      "Orchestrez vos menus : recherchez, consultez et créez vos recettes.",
    start_url: "/recettes",
    display: "standalone",
    background_color: "#fff3e9",
    theme_color: "#d8582e",
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
