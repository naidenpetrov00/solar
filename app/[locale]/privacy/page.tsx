import Link from "next/link";
import { getT } from "@/i18n.server";
import { assertCustomerPolicyReadiness, policyFacts } from "@/lib/legal/policy-facts";
import { PolicyDocument, type PolicySection } from "../_components/policy-document";
import { policyMetadata } from "../_lib/policy-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return policyMetadata(locale, "privacy", "privacy");
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const missing = assertCustomerPolicyReadiness();
  const { t } = await getT("privacy", { lng: locale });
  const fact = (value: string | null) => value ?? <span className="policy-missing">{t("missingFact")}</span>;
  const sections: PolicySection[] = [
    { title: t("controller.title"), paragraphs: [t("controller.body")], facts: [
      { label: t("controller.legalName"), value: fact(policyFacts.operator.legalName) },
      { label: t("controller.registration"), value: fact(policyFacts.operator.registrationNumber) },
      { label: t("controller.address"), value: fact(policyFacts.operator.registeredAddress) },
      { label: t("controller.contact"), value: fact(policyFacts.privacy.rightsEmail) },
      { label: t("controller.dpo"), value: fact(policyFacts.privacy.dataProtectionOfficer) },
    ] },
    { title: t("data.title"), paragraphs: [t("data.intro")], bullets: [t("data.orders"), t("data.accounts"), t("data.technical")] },
    { title: t("purposes.title"), bullets: [t("purposes.orders"), t("purposes.accounts"), t("purposes.security")] },
    { title: t("legalBasis.title"), paragraphs: [t("legalBasis.body")], facts: [
      { label: t("legalBasis.orders"), value: fact(policyFacts.privacy.orderLegalBasis) },
      { label: t("legalBasis.accounts"), value: fact(policyFacts.privacy.accountLegalBasis) },
      { label: t("legalBasis.security"), value: fact(policyFacts.privacy.securityLegalBasis) },
    ] },
    { title: t("sharing.title"), paragraphs: [t("sharing.body")], facts: [
      { label: t("sharing.hosting"), value: fact(policyFacts.privacy.productionHosting) },
      { label: t("sharing.database"), value: fact(policyFacts.privacy.databaseProvider) },
      { label: t("sharing.email"), value: fact(policyFacts.privacy.emailProvider) },
      { label: t("sharing.transfers"), value: fact(policyFacts.privacy.internationalTransfers) },
    ] },
    { title: t("retention.title"), paragraphs: [t("retention.body")], facts: [
      { label: t("retention.orders"), value: fact(policyFacts.privacy.orderRetention) },
      { label: t("retention.accounts"), value: fact(policyFacts.privacy.accountRetention) },
      { label: t("retention.logs"), value: fact(policyFacts.privacy.technicalLogRetention) },
    ] },
    { title: t("rights.title"), paragraphs: [t("rights.body")], bullets: [t("rights.access"), t("rights.rectification"), t("rights.erasure"), t("rights.restriction"), t("rights.portability"), t("rights.objection")] },
    { title: t("complaint.title"), paragraphs: [<>{t("complaint.body")} <Link href="https://cpdp.bg/" rel="external">{t("complaint.link")}</Link>.</>] },
    { title: t("storage.title"), paragraphs: [t("storage.body")] },
    { title: t("revision.title"), facts: [{ label: t("revision.date"), value: fact(policyFacts.revisionDate) }] },
  ];
  return <PolicyDocument title={t("page.title")} description={t("page.description")} incomplete={missing.length ? t("incomplete") : undefined} sections={sections} />;
}
