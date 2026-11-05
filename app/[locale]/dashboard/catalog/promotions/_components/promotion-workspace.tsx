import Link from "next/link";
import { ButtonLink } from "@/components/button";
import type { ManagedPromotionWorkspace } from "@/lib/catalog/management-promotion-types";
import type { PromotionLabels } from "./promotion-labels";
import { PromotionEditor } from "./promotion-editor";
import { formatCurrencyMinor } from "../../../../_lib/catalog-format";

function displayValue(
  promotion: ManagedPromotionWorkspace["promotions"][number],
  locale: string,
) {
  const raw = BigInt(promotion.value);
  if (promotion.discountType === "percentage") {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(raw) / 100)}%`;
  }
  return formatCurrencyMinor(locale, raw.toString(), "EUR");
}

function displayTimestamp(value: string | null, locale: string) {
  if (!value) return "—";
  return `${new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

export function PromotionWorkspace({
  workspace,
  locale,
  path,
  labels,
  creating,
}: {
  workspace: ManagedPromotionWorkspace;
  locale: string;
  path: string;
  labels: PromotionLabels;
  creating: boolean;
}) {
  return (
    <div className="dashboard-promotions-workspace">
      <section className="dashboard-promotions-list" aria-label={labels.listLabel}>
        {workspace.canManage ? (
          <ButtonLink href={`${path}?promotion=new`}>
            {labels.newPromotion}
          </ButtonLink>
        ) : (
          <p>{labels.readOnly}</p>
        )}
        {workspace.promotions.length ? (
          <ul>
            {workspace.promotions.map((promotion) => (
              <li key={promotion.id}>
                <Link
                  href={`${path}?promotion=${promotion.id}`}
                  aria-current={workspace.selected?.id === promotion.id ? "page" : undefined}
                >
                  <strong>{promotion.internalName}</strong>
                  <span>
                    {displayValue(promotion, locale)} · {labels.scopes[promotion.scope]}
                  </span>
                  <small>
                    {labels.statuses[promotion.status]} · {labels.targetCount.replace("{count}", String(promotion.targetCount))}
                  </small>
                  <small>
                    {labels.fields.startsAt.label}: {displayTimestamp(promotion.startsAt, locale)} · {labels.fields.endsAt.label}: {displayTimestamp(promotion.endsAt, locale)}
                  </small>
                  <small>
                    {labels.lastUpdated}: {displayTimestamp(promotion.updatedAt, locale)}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>{labels.empty}</p>
        )}
      </section>
      <section className="dashboard-promotions-detail">
        {workspace.selected || (creating && workspace.canManage) ? (
          <PromotionEditor
            key={workspace.selected?.id ?? "new"}
            detail={workspace.selected}
            locale={locale}
            canManage={workspace.canManage}
            categories={workspace.categories}
            products={workspace.products}
            labels={labels}
            path={path}
          />
        ) : (
          <div>
            <h2>{labels.noSelectionTitle}</h2>
            <p>{labels.noSelectionDescription}</p>
          </div>
        )}
      </section>
    </div>
  );
}
