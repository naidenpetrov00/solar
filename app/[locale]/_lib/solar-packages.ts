export type SolarPackage = {
  id: "essentials" | "smart" | "storage" | "complete";
  slug: string;
  imageSrc: string | null;
};

export const solarPackages: SolarPackage[] = [
  { id: "essentials", slug: "solar-essentials", imageSrc: null },
  { id: "smart", slug: "solar-smart", imageSrc: null },
  { id: "storage", slug: "solar-storage", imageSrc: null },
  { id: "complete", slug: "solar-complete", imageSrc: null },
];

export function findSolarPackage(packageSlug: string) {
  return solarPackages.find((solarPackage) => solarPackage.slug === packageSlug);
}

export function getSolarPackagePath(packageSlug: string) {
  return `shop/solar-packages/${packageSlug}`;
}
