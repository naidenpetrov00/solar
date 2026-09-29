import { getSolarPackagePath, solarPackages } from "./solar-packages";

export type ShopProduct = {
  id: string;
  href: string;
  nameKey: string;
  profileKey: string;
  energyTypeKey: string;
  priceBgn: number;
};

export type ShopCategory = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  products: ShopProduct[];
};

export const shopCategories: ShopCategory[] = [
  {
    slug: "solar-packages",
    titleKey: "pages.solarPackages.title",
    descriptionKey: "pages.solarPackages.description",
    products: solarPackages.map(({ id, slug, priceBgn }) => ({
      id,
      href: getSolarPackagePath(slug),
      nameKey: `pages.home.residential.packages.${id}.name`,
      profileKey: `pages.home.residential.packages.${id}.profile`,
      energyTypeKey: `pages.home.residential.packages.${id}.energyType`,
      priceBgn,
    })),
  },
];

export const shopProducts = shopCategories.flatMap((category) => category.products);

export function findShopProductById(id: string) {
  return shopProducts.find((product) => product.id === id);
}

export function formatBgnPrice(locale: string, amount: number) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
