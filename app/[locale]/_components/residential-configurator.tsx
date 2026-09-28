"use client";

import Link from "next/link";
import { useId, useState } from "react";

type Package = {
  id: string;
  name: string;
  profile: string;
  energyType: string;
  features: string[];
};

type ResidentialConfiguratorProps = {
  packages: Package[];
  quoteHref: string;
  labels: {
    bill: string;
    billPlaceholder: string;
    consumption: string;
    consumptionPlaceholder: string;
    inputLegend: string;
    inputNote: string;
    packagePrice: string;
    packagePriceValue: string;
    packagePriceNote: string;
    packagesHeading: string;
    quote: string;
  };
};

export function ResidentialConfigurator({ packages, quoteHref, labels }: ResidentialConfiguratorProps) {
  const [inputMode, setInputMode] = useState<"bill" | "consumption">("bill");
  const billInputId = useId();
  const consumptionInputId = useId();
  const noteId = useId();

  return (
    <div className="residential-configurator">
      <fieldset className="residential-input-choice">
        <legend>{labels.inputLegend}</legend>
        <div className="residential-input-options">
          <label className="residential-input-option">
            <input checked={inputMode === "bill"} name="energy-input-mode" onChange={() => setInputMode("bill")} type="radio" value="bill" />
            <span>{labels.bill}</span>
          </label>
          <label className="residential-input-option">
            <input checked={inputMode === "consumption"} name="energy-input-mode" onChange={() => setInputMode("consumption")} type="radio" value="consumption" />
            <span>{labels.consumption}</span>
          </label>
        </div>
        {inputMode === "bill" ? (
          <label className="residential-value-input" htmlFor={billInputId}>
            <span>{labels.bill}</span>
            <input aria-describedby={noteId} id={billInputId} inputMode="decimal" min="0" placeholder={labels.billPlaceholder} step="any" type="number" />
          </label>
        ) : (
          <label className="residential-value-input" htmlFor={consumptionInputId}>
            <span>{labels.consumption}</span>
            <input aria-describedby={noteId} id={consumptionInputId} inputMode="decimal" min="0" placeholder={labels.consumptionPlaceholder} step="any" type="number" />
          </label>
        )}
        <p className="residential-input-note" id={noteId}>{labels.inputNote}</p>
      </fieldset>

      <section aria-labelledby="residential-packages-heading" className="residential-packages">
        <h3 id="residential-packages-heading">{labels.packagesHeading}</h3>
        <div className="residential-package-list">
          {packages.map((solarPackage) => (
            <article className="residential-package" key={solarPackage.id}>
              <div className="residential-package-main">
                <p className="residential-package-type">{solarPackage.energyType}</p>
                <h4>{solarPackage.name}</h4>
                <p className="residential-package-profile">{solarPackage.profile}</p>
                <ul>{solarPackage.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              </div>
              <div className="residential-package-action">
                <p className="residential-package-price"><span>{labels.packagePrice}</span><strong>{labels.packagePriceValue}</strong></p>
                <p className="residential-package-price-note">{labels.packagePriceNote}</p>
                <Link className="residential-package-cta" href={quoteHref}>
                  {labels.quote}
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
