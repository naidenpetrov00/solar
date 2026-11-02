import "server-only";

type OptionalFact = string | null;

// These fields follow the disclosure structure of official EDPS/EDPB, CPDP,
// KZP, EU consumer-rights, and Directive 2011/83 materials. Those sources are
// structural references only; every factual value still requires verification.
export const policyFacts = {
  operator: {
    legalName: null as OptionalFact,
    registrationNumber: null as OptionalFact,
    vatNumber: null as OptionalFact,
    registeredAddress: null as OptionalFact,
    publicEmail: null as OptionalFact,
    publicPhone: null as OptionalFact,
  },
  privacy: {
    rightsEmail: null as OptionalFact,
    dataProtectionOfficer: null as OptionalFact,
    orderLegalBasis: null as OptionalFact,
    accountLegalBasis: null as OptionalFact,
    securityLegalBasis: null as OptionalFact,
    productionHosting: null as OptionalFact,
    databaseProvider: null as OptionalFact,
    emailProvider: null as OptionalFact,
    internationalTransfers: null as OptionalFact,
    orderRetention: null as OptionalFact,
    accountRetention: null as OptionalFact,
    technicalLogRetention: null as OptionalFact,
  },
  orders: {
    contractFormation: null as OptionalFact,
    paymentTiming: null as OptionalFact,
    deliveryAreas: null as OptionalFact,
    deliveryMethod: null as OptionalFact,
    deliveryCharges: null as OptionalFact,
    deliveryTiming: null as OptionalFact,
    cancellationBeforeConfirmation: null as OptionalFact,
    withdrawalAndReturns: null as OptionalFact,
    returnCosts: null as OptionalFact,
    complaintsProcess: null as OptionalFact,
    statutoryGuaranteeContact: null as OptionalFact,
    disputeResolution: null as OptionalFact,
  },
  revisionDate: null as OptionalFact,
} as const;

function missingFacts(value: unknown, path = "policyFacts"): string[] {
  if (value === null) return [path];
  if (typeof value === "string" && value.trim().length === 0) return [path];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) =>
    missingFacts(nested, `${path}.${key}`),
  );
}

export function assertCustomerPolicyReadiness() {
  const missing = missingFacts(policyFacts);
  if (process.env.NODE_ENV === "production" && missing.length) {
    throw new Error(`Customer policy facts are incomplete: ${missing.join(", ")}`);
  }
  return missing;
}
