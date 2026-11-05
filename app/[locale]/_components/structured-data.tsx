export function StructuredData({ value }: { value: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(value).replace(/</gu, "\\u003c"),
      }}
    />
  );
}
