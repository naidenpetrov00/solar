import { getT } from "@/i18n.server";
import { assertCustomerPolicyReadiness, policyFacts } from "@/lib/legal/policy-facts";
import { PolicyDocument, type PolicySection } from "../_components/policy-document";
import { policyMetadata } from "../_lib/policy-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return policyMetadata(locale, "terms", "terms");
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const missing = assertCustomerPolicyReadiness();
  const { t } = await getT("terms", { lng: locale });
  const fact = (value: string | null) => value ?? <span className="policy-missing">{t("missingFact")}</span>;
  const sections: PolicySection[] = [
    { title: t("operator.title"), paragraphs: [t("operator.body")], facts: [
      { label: t("operator.legalName"), value: fact(policyFacts.operator.legalName) },
      { label: t("operator.registration"), value: fact(policyFacts.operator.registrationNumber) },
      { label: t("operator.vat"), value: fact(policyFacts.operator.vatNumber) },
      { label: t("operator.address"), value: fact(policyFacts.operator.registeredAddress) },
      { label: t("operator.email"), value: fact(policyFacts.operator.publicEmail) },
      { label: t("operator.phone"), value: fact(policyFacts.operator.publicPhone) },
    ] },
    { title: t("process.title"), paragraphs: [t("process.pending"), t("process.noPayment"), t("process.revalidation")] },
    { title: t("price.title"), paragraphs: [t("price.body")], bullets: [t("price.cash"), t("price.bank"), t("price.phone")], facts: [
      { label: t("price.timing"), value: fact(policyFacts.orders.paymentTiming) },
    ] },
    { title: t("contract.title"), paragraphs: [t("contract.body")], facts: [{ label: t("contract.effect"), value: fact(policyFacts.orders.contractFormation) }] },
    { title: t("delivery.title"), paragraphs: [t("delivery.body")], facts: [
      { label: t("delivery.areas"), value: fact(policyFacts.orders.deliveryAreas) },
      { label: t("delivery.method"), value: fact(policyFacts.orders.deliveryMethod) },
      { label: t("delivery.charges"), value: fact(policyFacts.orders.deliveryCharges) },
      { label: t("delivery.timing"), value: fact(policyFacts.orders.deliveryTiming) },
    ] },
    { title: t("changes.title"), paragraphs: [t("changes.body")], facts: [
      { label: t("changes.cancellation"), value: fact(policyFacts.orders.cancellationBeforeConfirmation) },
      { label: t("changes.withdrawal"), value: fact(policyFacts.orders.withdrawalAndReturns) },
      { label: t("changes.costs"), value: fact(policyFacts.orders.returnCosts) },
    ] },
    { title: t("complaints.title"), paragraphs: [t("complaints.body")], facts: [
      { label: t("complaints.process"), value: fact(policyFacts.orders.complaintsProcess) },
      { label: t("complaints.guarantee"), value: fact(policyFacts.orders.statutoryGuaranteeContact) },
      { label: t("complaints.disputes"), value: fact(policyFacts.orders.disputeResolution) },
    ] },
    { title: t("revision.title"), facts: [{ label: t("revision.date"), value: fact(policyFacts.revisionDate) }] },
  ];
  return <PolicyDocument title={t("page.title")} description={t("page.description")} incomplete={missing.length ? t("incomplete") : undefined} sections={sections} />;
}
