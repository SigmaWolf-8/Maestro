export type EncryptionFieldMap = Record<string, string[]>;

export const ENCRYPTION_FIELD_MAP: EncryptionFieldMap = {
  tenants: [
    "companyName",
    "contactEmail",
  ],

  tenantUsers: [
    "email",
  ],

  projects: [
    "name",
    "description",
  ],

  wbsNodes: [
    "codeDisplay",
    "title",
    "description",
  ],

  navigationItems: [
    "title",
    "iconName",
    "path",
    "component",
  ],

  tenantApplications: [
    "name",
    "url",
    "iconName",
  ],

  wbsTemplates: [
    "name",
    "description",
  ],

  userGroups: [
    "name",
    "description",
  ],

  documents: [
    "name",
    "description",
    "originalFilename",
    "plainContent",
    "checksum",
  ],

  wbsMasterCodes: [
    "code",
    "name",
    "description",
  ],

  documentMetaTags: [
    "customValue",
  ],

  customers: [
    "address",
    "city",
    "stateProvince",
    "zipPostalCode",
    "countryRegion",
    "firstName",
    "lastName",
    "webPage",
    "homePhone",
    "workPhone",
    "mobilePhone2",
    "mobilePhone",
    "email1",
    "email2",
  ],

  quotes: [
    "qNum",
    "customer",
    "division",
    "model",
    "projectAddress",
    "lot",
    "block",
    "plan",
  ],

  vendors: [
    "vendorId",
    "company",
    "address",
    "city",
    "stateProvince",
    "zipPostalCode",
    "countryRegion",
    "insurance",
    "wcbNum",
    "gstNum",
    "apTerms",
    "arTerms",
  ],

  vendorContacts: [
    "firstName",
    "lastName",
    "jobTitle",
    "businessPhone",
    "mobilePhone",
    "faxNumber",
    "emailAddress",
  ],

  customerContacts: [
    "firstName",
    "lastName",
    "jobTitle",
    "businessPhone",
    "mobilePhone",
    "faxNumber",
    "emailAddress",
  ],

  employeeRoles: [
    "roleName",
    "description",
  ],

  documentLocks: [
    "lockId",
  ],

  documentAuditLogs: [
    "action",
    "ipAddress",
    "userAgent",
  ],

  wopiSessions: [
    "accessToken",
  ],

  msGraphTokens: [
    "accessToken",
    "refreshToken",
    "scopes",
  ],

  subscriptionPlans: [
    "name",
  ],

  tenantSubscriptions: [
    "stripeCustomerId",
    "stripeSubscriptionId",
    "tatWalletAddress",
    "algorandAccountAddress",
    "hederaAccountId",
    "hederaTopicId",
  ],

  subscriptionInvoices: [
    "stripeInvoiceId",
    "pdfUrl",
    "tatTransactionId",
    "algorandTxId",
    "hederaTxId",
    "hederaConsensusTimestamp",
  ],

  pricingConfig: [
    "value",
    "description",
  ],

  stripeSync: [
    "stripeProductId",
    "stripePriceId",
    "stripePriceIdYearly",
    "previousPriceId",
    "previousPriceIdYearly",
    "errorMessage",
  ],

  scheduleTaskTemplates: [
    "taskName",
    "supplierTrade",
    "responsibility",
    "whosTask",
    "supervisor",
    "ref",
    "poRefNum",
    "moneyCode",
    "memo",
  ],

  scheduleTasks: [
    "taskName",
    "supplierTrade",
    "responsibility",
    "whosTask",
    "supervisor",
    "ref",
    "poRefNum",
    "moneyCode",
    "poNumber",
    "memo",
  ],
};

export const ENCRYPTED_MARKER = "__pnEncrypted__";

export function getEncryptableFields(tableName: string): string[] {
  return ENCRYPTION_FIELD_MAP[tableName] || [];
}

export function isEncryptableField(tableName: string, fieldName: string): boolean {
  const fields = ENCRYPTION_FIELD_MAP[tableName];
  return fields ? fields.includes(fieldName) : false;
}

export function getAllEncryptedTables(): string[] {
  return Object.keys(ENCRYPTION_FIELD_MAP);
}
