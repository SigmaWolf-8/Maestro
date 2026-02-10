import type { IStorage } from "../storage";
import {
  encryptField,
  decryptField,
  encryptRecord,
  decryptRecord,
  decryptRecords,
} from "../services/data-encryption-service";
import { getEncryptableFields } from "../security/encryption-map";

type MethodTableMap = Record<string, string>;

const METHOD_TABLE_MAP: MethodTableMap = {
  getTenant: "tenants",
  getTenantBySubdomain: "tenants",
  getAllTenants: "tenants",
  createTenant: "tenants",
  updateTenant: "tenants",
  getTenantUser: "tenantUsers",
  getTenantUserByEmail: "tenantUsers",
  getTenantUsers: "tenantUsers",
  createTenantUser: "tenantUsers",
  getProject: "projects",
  getProjects: "projects",
  createProject: "projects",
  updateProject: "projects",
  getWbsNode: "wbsNodes",
  getWbsNodes: "wbsNodes",
  getWbsNodesByProject: "wbsNodes",
  createWbsNode: "wbsNodes",
  updateWbsNode: "wbsNodes",
  getNavigationItems: "navigationItems",
  createNavigationItem: "navigationItems",
  getWbsTemplates: "wbsTemplates",
  getWbsTemplate: "wbsTemplates",
  createWbsTemplate: "wbsTemplates",
  updateWbsTemplate: "wbsTemplates",
  getUserGroups: "userGroups",
  getUserGroup: "userGroups",
  createUserGroup: "userGroups",
  updateUserGroup: "userGroups",
  getUserGroupsForUser: "userGroups",
  getTenantApplications: "tenantApplications",
  createTenantApplication: "tenantApplications",
  getDocuments: "documents",
  getDocument: "documents",
  getDocumentsByProject: "documents",
  createDocument: "documents",
  updateDocument: "documents",
  getDocumentsWithMetaTags: "documents",
  getWbsMasterCodes: "wbsMasterCodes",
  getWbsMasterCode: "wbsMasterCodes",
  createWbsMasterCode: "wbsMasterCodes",
  updateWbsMasterCode: "wbsMasterCodes",
  getDocumentMetaTags: "documentMetaTags",
  setDocumentMetaTags: "documentMetaTags",
  getCustomers: "customers",
  getCustomer: "customers",
  getCustomerByJobNum: "customers",
  createCustomer: "customers",
  updateCustomer: "customers",
  updateCustomerField: "customers",
  getQuotes: "quotes",
  getQuote: "quotes",
  getQuoteByJobNum: "quotes",
  createQuote: "quotes",
  updateQuote: "quotes",
  updateQuoteField: "quotes",
  getVendors: "vendors",
  getVendor: "vendors",
  getVendorByCompany: "vendors",
  createVendor: "vendors",
  updateVendor: "vendors",
  updateVendorField: "vendors",
  getVendorContacts: "vendorContacts",
  getVendorContact: "vendorContacts",
  getPrimaryVendorContact: "vendorContacts",
  createVendorContact: "vendorContacts",
  updateVendorContact: "vendorContacts",
  getCustomerContacts: "customerContacts",
  getCustomerContact: "customerContacts",
  getPrimaryCustomerContact: "customerContacts",
  createCustomerContact: "customerContacts",
  updateCustomerContact: "customerContacts",
  getDocumentLock: "documentLocks",
  getDocumentLockByLockId: "documentLocks",
  createDocumentLock: "documentLocks",
  updateDocumentLock: "documentLocks",
  getDocumentAuditLogs: "documentAuditLogs",
  createDocumentAuditLog: "documentAuditLogs",
  getWopiSession: "wopiSessions",
  getWopiSessionsByDocument: "wopiSessions",
  createWopiSession: "wopiSessions",
  updateWopiSession: "wopiSessions",
  getMsGraphToken: "msGraphTokens",
  upsertMsGraphToken: "msGraphTokens",
  getSubscriptionPlans: "subscriptionPlans",
  getSubscriptionPlan: "subscriptionPlans",
  getSubscriptionPlanByCode: "subscriptionPlans",
  createSubscriptionPlan: "subscriptionPlans",
  updateSubscriptionPlan: "subscriptionPlans",
  getTenantSubscription: "tenantSubscriptions",
  getTenantSubscriptionById: "tenantSubscriptions",
  createTenantSubscription: "tenantSubscriptions",
  updateTenantSubscription: "tenantSubscriptions",
  getAllActiveSubscriptions: "tenantSubscriptions",
  getSubscriptionInvoices: "subscriptionInvoices",
  getSubscriptionInvoice: "subscriptionInvoices",
  createSubscriptionInvoice: "subscriptionInvoices",
  updateSubscriptionInvoice: "subscriptionInvoices",
  getPricingConfigs: "pricingConfig",
  getPricingConfig: "pricingConfig",
  upsertPricingConfig: "pricingConfig",
  getStripeSyncRecords: "stripeSync",
  createStripeSyncRecord: "stripeSync",
  updateStripeSyncRecord: "stripeSync",
};

const CREATE_METHODS = new Set([
  "createTenant",
  "createTenantUser",
  "createProject",
  "createWbsNode",
  "createNavigationItem",
  "createWbsTemplate",
  "createUserGroup",
  "createTenantApplication",
  "createDocument",
  "createWbsMasterCode",
  "createCustomer",
  "createQuote",
  "createVendor",
  "createVendorContact",
  "createCustomerContact",
  "createDocumentLock",
  "createDocumentAuditLog",
  "createWopiSession",
  "createSubscriptionPlan",
  "createTenantSubscription",
  "createSubscriptionInvoice",
  "upsertPricingConfig",
  "createStripeSyncRecord",
  "upsertMsGraphToken",
  "upsertUsageMetric",
  "addUserToGroup",
  "setGroupPermission",
]);

const UPDATE_METHODS = new Set([
  "updateTenant",
  "updateProject",
  "updateWbsNode",
  "updateWbsTemplate",
  "updateUserGroup",
  "updateDocument",
  "updateWbsMasterCode",
  "updateCustomer",
  "updateCustomerField",
  "updateQuote",
  "updateQuoteField",
  "updateVendor",
  "updateVendorField",
  "updateVendorContact",
  "updateCustomerContact",
  "updateDocumentLock",
  "updateWopiSession",
  "updateSubscriptionPlan",
  "updateTenantSubscription",
  "updateSubscriptionInvoice",
  "updateGroupPermission",
  "updateStripeSyncRecord",
]);

const LIST_METHODS = new Set([
  "getAllTenants",
  "getTenantUsers",
  "getProjects",
  "getWbsNodes",
  "getWbsNodesByProject",
  "getNavigationItems",
  "getWbsTemplates",
  "getUserGroups",
  "getUserGroupsForUser",
  "getTenantApplications",
  "getDocuments",
  "getDocumentsByProject",
  "getDocumentsWithMetaTags",
  "getWbsMasterCodes",
  "getDocumentMetaTags",
  "setDocumentMetaTags",
  "getCustomers",
  "getQuotes",
  "getVendors",
  "getVendorContacts",
  "getCustomerContacts",
  "getDocumentAuditLogs",
  "getWopiSessionsByDocument",
  "getSubscriptionPlans",
  "getAllActiveSubscriptions",
  "getSubscriptionInvoices",
  "getPricingConfigs",
  "getStripeSyncRecords",
]);

const SINGLE_METHODS = new Set([
  "getTenant",
  "getTenantBySubdomain",
  "getTenantUser",
  "getTenantUserByEmail",
  "getProject",
  "getWbsNode",
  "getWbsTemplate",
  "getUserGroup",
  "getDocument",
  "getWbsMasterCode",
  "getCustomer",
  "getCustomerByJobNum",
  "getQuote",
  "getQuoteByJobNum",
  "getVendor",
  "getVendorByCompany",
  "getVendorContact",
  "getPrimaryVendorContact",
  "getCustomerContact",
  "getPrimaryCustomerContact",
  "getDocumentLock",
  "getDocumentLockByLockId",
  "getWopiSession",
  "getMsGraphToken",
  "getSubscriptionPlan",
  "getSubscriptionPlanByCode",
  "getTenantSubscription",
  "getTenantSubscriptionById",
  "getSubscriptionInvoice",
  "getPricingConfig",
  "getUsageMetric",
]);

const COMPOSITE_LIST_METHODS: Record<string, { fields: Record<string, string> }> = {
  getAllVendorContacts: {
    fields: {
      contact: "vendorContacts",
      vendorName: "vendors",
    },
  },
  getAllCustomerContacts: {
    fields: {
      contact: "customerContacts",
      jobNum: "customers",
    },
  },
};

function getCreateDataArgIndex(methodName: string): number {
  if (methodName === "updateCustomerField" || methodName === "updateQuoteField") return -1;
  if (methodName === "updateVendorField") return -1;
  if (UPDATE_METHODS.has(methodName)) return 1;
  return 0;
}

export function createEncryptedStorage(baseStorage: IStorage): IStorage {
  const handler: ProxyHandler<IStorage> = {
    get(target, prop: string, receiver) {
      const original = Reflect.get(target, prop, receiver);
      if (typeof original !== "function") return original;

      const tableName = METHOD_TABLE_MAP[prop];
      if (!tableName && !(prop in COMPOSITE_LIST_METHODS)) {
        return original.bind(target);
      }

      return async function (...args: any[]) {
        if (CREATE_METHODS.has(prop)) {
          const dataArgIdx = getCreateDataArgIndex(prop);
          if (dataArgIdx >= 0 && dataArgIdx < args.length && args[dataArgIdx] && typeof args[dataArgIdx] === "object") {
            args[dataArgIdx] = encryptRecord(tableName, args[dataArgIdx]);
          }
          const result = await original.apply(target, args);
          if (Array.isArray(result)) {
            return decryptRecords(tableName, result);
          }
          return decryptRecord(tableName, result);
        }

        if (UPDATE_METHODS.has(prop)) {
          const dataArgIdx = getCreateDataArgIndex(prop);
          if (dataArgIdx >= 0 && dataArgIdx < args.length && args[dataArgIdx] && typeof args[dataArgIdx] === "object") {
            args[dataArgIdx] = encryptRecord(tableName, args[dataArgIdx]);
          }
          if (prop === "updateCustomerField" || prop === "updateQuoteField" || prop === "updateVendorField") {
            const fieldIdx = prop === "updateVendorField" ? 1 : 2;
            const valueIdx = prop === "updateVendorField" ? 2 : 3;
            if (args[valueIdx] !== null && args[valueIdx] !== undefined && typeof args[valueIdx] === "string") {
              const fields = getEncryptableFields(tableName);
              if (fields.includes(args[fieldIdx])) {
                args[valueIdx] = encryptField(args[valueIdx]);
              }
            }
          }
          const result = await original.apply(target, args);
          return decryptRecord(tableName, result);
        }

        if (prop in COMPOSITE_LIST_METHODS) {
          const result = await original.apply(target, args);
          if (Array.isArray(result)) {
            const config = COMPOSITE_LIST_METHODS[prop];
            return result.map((item: any) => {
              const decrypted = { ...item };
              for (const [field, table] of Object.entries(config.fields)) {
                if (field in decrypted && decrypted[field] != null) {
                  if (typeof decrypted[field] === "object") {
                    decrypted[field] = decryptRecord(table, decrypted[field]);
                  } else if (typeof decrypted[field] === "string") {
                    decrypted[field] = decryptField(decrypted[field]);
                  }
                }
              }
              return decrypted;
            });
          }
          return result;
        }

        if (LIST_METHODS.has(prop)) {
          const result = await original.apply(target, args);
          if (Array.isArray(result)) {
            return decryptRecords(tableName, result);
          }
          return result;
        }

        if (SINGLE_METHODS.has(prop)) {
          const result = await original.apply(target, args);
          return decryptRecord(tableName, result);
        }

        return original.apply(target, args);
      };
    },
  };

  return new Proxy(baseStorage, handler);
}
