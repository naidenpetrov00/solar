export type SolarPackage = {
  id: "essentials" | "smart" | "storage" | "complete";
  slug: string;
  imageSrc: string | null;
  priceBgn: number;
};

// Temporary price shown throughout the existing package experience.
export const temporaryPackagePriceBgn = 1000;

export const solarPackages: SolarPackage[] = [
  { id: "essentials", slug: "solar-essentials", imageSrc: null, priceBgn: temporaryPackagePriceBgn },
  { id: "smart", slug: "solar-smart", imageSrc: null, priceBgn: temporaryPackagePriceBgn },
  { id: "storage", slug: "solar-storage", imageSrc: null, priceBgn: temporaryPackagePriceBgn },
  { id: "complete", slug: "solar-complete", imageSrc: null, priceBgn: temporaryPackagePriceBgn },
];

export function findSolarPackage(packageSlug: string) {
  return solarPackages.find((solarPackage) => solarPackage.slug === packageSlug);
}

export function getSolarPackagePath(packageSlug: string) {
  return `shop/solar-packages/${packageSlug}`;
}
