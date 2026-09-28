"use client";

import Link from "next/link";
import { useId, useState, ViewTransition } from "react";

type Package = {
  id: string;
  href: string;
  name: string;
  profile: string;
  energyType: string;
  specifications: string[];
};

type ResidentialConfiguratorProps = {
  packages: Package[];
  labels: {
    bill: string;
    billPlaceholder: string;
    consumption: string;
    consumptionPlaceholder: string;
    inputLegend: string;
    inputNote: string;
    packagePrice: string;
    packagePriceNote: string;
    packagePriceValue: string;
    packagesHeading: string;
    viewPackage: string;
  };
};

export function ResidentialConfigurator({ packages, labels }: ResidentialConfiguratorProps) {
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
        <div className="residential-packages-heading">
          <h3 id="residential-packages-heading">{labels.packagesHeading}</h3>
          <p>{labels.packagePriceNote}</p>
        </div>
        <ViewTransition
          default="none"
          exit={{ "package-detail": "package-detail-out", default: "none" }}
        >
          <div className="residential-package-grid">
          {packages.map((solarPackage) => (
            <article className="residential-package-card" key={solarPackage.id}>
              <Link className="residential-package-card-link" href={solarPackage.href} scroll transitionTypes={["package-detail"]}>
                <div aria-hidden="true" className="residential-package-visual" />
                <div className="residential-package-card-content">
                  <p className="residential-package-type">{solarPackage.energyType}</p>
                  <h4>{solarPackage.name}</h4>
                  <p className="residential-package-profile">{solarPackage.profile}</p>
                  <ul className="residential-package-specifications">
                    {solarPackage.specifications.map((specification) => <li key={specification}>{specification}</li>)}
                  </ul>
                  <p className="residential-package-price">
                    <span>{labels.packagePrice}</span>
                    <strong>{labels.packagePriceValue}</strong>
                  </p>
                  <span className="residential-package-card-action">
                    {labels.viewPackage}
                    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
                  </span>
                </div>
              </Link>
            </article>
          ))}
          </div>
        </ViewTransition>
      </section>
    </div>
  );
}
