import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Solar",
    short_name: "Solar",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f3ee",
    theme_color: "#090b0a",
  };
}
