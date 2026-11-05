import Image from "next/image";

type Props = {
  reference: string;
  altText: string;
  className?: string;
  preload?: boolean;
  sizes?: string;
  source?: "managed" | "legacy";
  width?: number | null;
  height?: number | null;
};

export function CatalogMedia({
  reference,
  altText,
  className,
  preload = false,
  sizes = "(max-width: 48rem) 100vw, 50vw",
  source = "legacy",
}: Props) {
  if (
    source === "managed" ||
    (reference.startsWith("/") && !reference.startsWith("//"))
  ) {
    return (
      <Image
        src={reference}
        alt={altText}
        className={className}
        fill
        preload={preload}
        sizes={sizes}
      />
    );
  }

  let externalUrl: URL;
  try {
    externalUrl = new URL(reference);
  } catch {
    return null;
  }
  if (externalUrl.protocol !== "https:") return null;

  return (
    // External catalog hosts are intentionally not proxied through Next Image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={externalUrl.toString()}
      alt={altText}
      className={className}
      loading={preload ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={preload ? "high" : "auto"}
    />
  );
}
