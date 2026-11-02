import type { ReactNode } from "react";

export type PolicySection = {
  title: string;
  paragraphs?: ReactNode[];
  bullets?: ReactNode[];
  facts?: Array<{ label: string; value: ReactNode }>;
};

export function PolicyDocument({
  title,
  description,
  incomplete,
  sections,
}: {
  title: string;
  description: string;
  incomplete?: string;
  sections: PolicySection[];
}) {
  return <main id="main-content" className="policy-page">
    <article className="policy-document">
      <header className="policy-heading"><h1>{title}</h1><p>{description}</p></header>
      {incomplete ? <aside className="policy-incomplete" role="note"><p>{incomplete}</p></aside> : null}
      {sections.map((section) => <section key={section.title}>
        <h2>{section.title}</h2>
        {section.paragraphs?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {section.bullets?.length ? <ul>{section.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul> : null}
        {section.facts?.length ? <dl>{section.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : null}
      </section>)}
    </article>
  </main>;
}
