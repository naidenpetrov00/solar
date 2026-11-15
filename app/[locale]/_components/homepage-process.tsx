type Translate = (key: string) => string;

const processSteps = [
  "enquiry",
  "survey",
  "proposal",
  "documentation",
  "delivery",
  "installation",
  "maintenance",
] as const;

export function HomepageProcess({ t }: { t: Translate }) {
  return (
    <section className="welcome-process" aria-labelledby="process-heading">
      <div className="welcome-process-introduction">
        <h2 id="process-heading">{t("pages.home.process.title")}</h2>
        <div>
          <p>{t("pages.home.process.introduction")}</p>
          <p className="welcome-process-note">
            {t("pages.home.process.documentationNote")}
          </p>
        </div>
      </div>
      <ol className="welcome-process-steps">
        {processSteps.map((step) => (
          <li key={step}>{t(`pages.home.process.steps.${step}`)}</li>
        ))}
      </ol>
    </section>
  );
}
