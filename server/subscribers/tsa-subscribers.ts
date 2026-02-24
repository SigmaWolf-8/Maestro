import { PlenumNetTsaClient, type TimestampResponse } from '../services/plenumnet/tsa-client';
import { db } from '../db';
import { documents, type DocumentEvent } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { type EventBusService } from '../services/event-bus-service';

async function getDocumentBuffer(documentId: string): Promise<Buffer | null> {
  const [doc] = await db
    .select({ plainContent: documents.plainContent, encryptedContent: documents.encryptedContent })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) return null;

  const content = doc.plainContent || doc.encryptedContent;
  if (!content) return null;

  const b64 = /^[A-Za-z0-9+/\n\r]+=*$/.test(content.slice(0, 256));
  if (b64 && content.length > 64) {
    try {
      return Buffer.from(content, 'base64');
    } catch {
      return Buffer.from(content, 'utf-8');
    }
  }
  return Buffer.from(content, 'utf-8');
}

async function storeTimestampToken(
  documentId: string,
  token: string,
  meta: Record<string, unknown>,
): Promise<void> {
  const [doc] = await db
    .select({ metadata: documents.metadata })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) return;

  const existing = (doc.metadata as Record<string, unknown>) || {};
  const tsaTokens = Array.isArray(existing.tsaTokens) ? existing.tsaTokens : [];
  tsaTokens.push({ token, ...meta, storedAt: new Date().toISOString() });

  await db
    .update(documents)
    .set({
      metadata: { ...existing, tsaTokens, lastTsaTimestamp: meta.genTime },
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
}

async function logTsaEvent(
  eventBus: EventBusService,
  originalEvent: DocumentEvent,
  tsaResult: TimestampResponse,
  policyTier: string,
): Promise<void> {
  try {
    await eventBus.publish({
      tenantId: originalEvent.tenantId,
      eventType: 'tsa.token_issued',
      documentId: originalEvent.documentId ?? undefined,
      projectId: originalEvent.projectId ?? undefined,
      userId: 'system',
      correlationId: originalEvent.correlationId ?? originalEvent.id,
      payload: {
        triggerEventId: originalEvent.id,
        triggerEventType: originalEvent.eventType,
        tsaSerialNumber: tsaResult.serialNumber,
        tsaGenTime: tsaResult.genTime,
        tsaPolicyOid: tsaResult.policy,
        tsaPolicyTier: policyTier,
        tsaPolicyName: tsaResult.policyName,
        tsaOrdering: tsaResult.ordering,
        tsaMerkleLeaf: tsaResult.merkleLeafHash,
        tsaMerkleRoot: tsaResult.merkleRoot,
        tsaTldsaSigned: tsaResult.tldsaSignature ? 'yes' : 'no',
        tsaTokenStored: true,
      },
    });
  } catch (err) {
    console.warn('Failed to emit tsa.token_issued event:', (err as Error).message);
  }
}

export function registerTsaSubscribers(
  eventBus: EventBusService,
  tsaClient: PlenumNetTsaClient,
): void {

  eventBus.registerHandler('document.staged', 'tsa_document_staged', async (event) => {
    try {
      if (!event.documentId) return;
      const docBuffer = await getDocumentBuffer(event.documentId);
      if (!docBuffer) return;

      const result = await tsaClient.timestampDocument(docBuffer, 'FORENSICS');
      await storeTimestampToken(event.documentId, result.timestamp.token, {
        phase: 'staged',
        eventId: event.id,
        documentHash: result.documentHash,
        serialNumber: result.timestamp.serialNumber,
        genTime: result.timestamp.genTime,
        policyTier: 'FORENSICS',
      });
      await logTsaEvent(eventBus, event, result.timestamp, 'FORENSICS');
    } catch (error) {
      console.warn('TSA timestamp failed for document.staged:', (error as Error).message);
    }
  });

  eventBus.registerHandler('document.reviewed', 'tsa_document_reviewed', async (event) => {
    try {
      const meta = (event.metadata as Record<string, unknown>) || {};
      const eventPayload = {
        documentId: event.documentId,
        decision: meta.decision,
        reviewerId: event.userId,
        wbsNodeId: event.wbsNodeId,
        comments: meta.comments,
        originalEventId: event.id,
      };

      const result = await tsaClient.timestampEvent(eventPayload, 'FORENSICS');
      if (event.documentId) {
        await storeTimestampToken(event.documentId, result.token, {
          phase: 'reviewed',
          decision: meta.decision,
          eventId: event.id,
          serialNumber: result.serialNumber,
          genTime: result.genTime,
          policyTier: 'FORENSICS',
        });
      }
      await logTsaEvent(eventBus, event, result, 'FORENSICS');
    } catch (error) {
      console.warn('TSA timestamp failed for document.reviewed:', (error as Error).message);
    }
  });

  eventBus.registerHandler('document.version_locked', 'tsa_document_version_locked', async (event) => {
    try {
      if (!event.documentId) return;
      const docBuffer = await getDocumentBuffer(event.documentId);
      if (!docBuffer) return;

      const meta = (event.metadata as Record<string, unknown>) || {};
      const result = await tsaClient.timestampDocument(docBuffer, 'FORENSICS');
      await storeTimestampToken(event.documentId, result.timestamp.token, {
        phase: 'version_locked',
        eventId: event.id,
        documentHash: result.documentHash,
        serialNumber: result.timestamp.serialNumber,
        genTime: result.timestamp.genTime,
        policyTier: 'FORENSICS',
        approvalCount: meta.approvalCount,
        requiredCount: meta.requiredCount,
      });
      await logTsaEvent(eventBus, event, result.timestamp, 'FORENSICS');
    } catch (error) {
      console.warn('TSA timestamp failed for document.version_locked:', (error as Error).message);
    }
  });

  eventBus.registerHandler('document.classified', 'tsa_classified_invoice', async (event) => {
    const payload = (event.payload as Record<string, unknown>) || {};
    const meta = (event.metadata as Record<string, unknown>) || {};
    const docType = (payload.documentType || meta.documentType || '') as string;
    if (docType !== 'invoice') return;

    try {
      if (!event.documentId) return;
      const docBuffer = await getDocumentBuffer(event.documentId);
      if (!docBuffer) return;

      const result = await tsaClient.timestampDocument(docBuffer, 'COMPLY');
      await storeTimestampToken(event.documentId, result.timestamp.token, {
        phase: 'classified',
        classification: 'invoice',
        eventId: event.id,
        documentHash: result.documentHash,
        serialNumber: result.timestamp.serialNumber,
        genTime: result.timestamp.genTime,
        policyTier: 'COMPLY',
        vendorName: meta.vendorName,
      });
      await logTsaEvent(eventBus, event, result.timestamp, 'COMPLY');
    } catch (error) {
      console.warn('TSA timestamp failed for invoice classification:', (error as Error).message);
    }
  });

  eventBus.registerHandler('document.classified', 'tsa_classified_safety', async (event) => {
    const payload = (event.payload as Record<string, unknown>) || {};
    const meta = (event.metadata as Record<string, unknown>) || {};
    const docType = (payload.documentType || meta.documentType || '') as string;
    const safetyTypes = ['inspection_report', 'safety_inspection', 'incident_report'];
    if (!safetyTypes.includes(docType)) return;

    try {
      if (!event.documentId) return;
      const docBuffer = await getDocumentBuffer(event.documentId);
      if (!docBuffer) return;

      const result = await tsaClient.timestampDocument(docBuffer, 'SENTINEL');
      await storeTimestampToken(event.documentId, result.timestamp.token, {
        phase: 'classified',
        classification: docType,
        eventId: event.id,
        documentHash: result.documentHash,
        serialNumber: result.timestamp.serialNumber,
        genTime: result.timestamp.genTime,
        policyTier: 'SENTINEL',
        inspectorName: meta.inspectorName,
      });
      await logTsaEvent(eventBus, event, result.timestamp, 'SENTINEL');
    } catch (error) {
      console.warn('TSA timestamp failed for safety classification:', (error as Error).message);
    }
  });

  eventBus.registerHandler('archive.sealed', 'tsa_archive_sealed', async (event) => {
    try {
      const meta = (event.metadata as Record<string, unknown>) || {};
      const payload = (event.payload as Record<string, unknown>) || {};
      const archivePayload = {
        projectId: event.projectId || meta.projectId,
        documentCount: meta.documentCount || payload.documentCount,
        wbsNodeCount: meta.wbsNodeCount || payload.wbsNodeCount,
        archiveSize: meta.archiveSize || payload.archiveSize,
        manifestHash: payload.sha3Hash || meta.manifestHash,
        sealEventId: event.id,
      };

      const result = await tsaClient.timestampEvent(archivePayload, 'SENTINEL');
      if (event.documentId) {
        await storeTimestampToken(event.documentId, result.token, {
          phase: 'archive_sealed',
          eventId: event.id,
          serialNumber: result.serialNumber,
          genTime: result.genTime,
          policyTier: 'SENTINEL',
          documentCount: meta.documentCount,
          manifestHash: payload.sha3Hash || meta.manifestHash,
        });
      }
      await logTsaEvent(eventBus, event, result, 'SENTINEL');
    } catch (error) {
      console.warn('TSA timestamp failed for archive.sealed:', (error as Error).message);
    }
  });

  eventBus.registerHandler('review.escalation', 'tsa_review_escalation', async (event) => {
    try {
      const meta = (event.metadata as Record<string, unknown>) || {};
      const result = await tsaClient.timestampEvent({
        documentId: event.documentId,
        escalationType: 'review_overdue',
        reviewerId: meta.reviewerId,
        daysOverdue: meta.daysOverdue,
        eventId: event.id,
      }, 'DEFAULT');
      await logTsaEvent(eventBus, event, result, 'DEFAULT');
    } catch (error) {
      console.warn('TSA timestamp failed for review.escalation:', (error as Error).message);
    }
  });

  eventBus.registerHandler('upload.sync_complete', 'tsa_upload_sync_complete', async (event) => {
    try {
      const meta = (event.metadata as Record<string, unknown>) || {};
      const result = await tsaClient.timestampEvent({
        uploadCount: meta.uploadCount,
        fieldWorkerId: event.userId,
        projectId: event.projectId || meta.projectId,
        eventId: event.id,
      }, 'DEFAULT');
      await logTsaEvent(eventBus, event, result, 'DEFAULT');
    } catch (error) {
      console.warn('TSA timestamp failed for upload.sync_complete:', (error as Error).message);
    }
  });

  eventBus.registerHandler('upload.sync_failure', 'tsa_upload_sync_failure', async (event) => {
    try {
      const meta = (event.metadata as Record<string, unknown>) || {};
      const result = await tsaClient.timestampEvent({
        errorType: meta.errorType,
        fieldWorkerId: event.userId,
        projectId: event.projectId || meta.projectId,
        eventId: event.id,
      }, 'DEFAULT');
      await logTsaEvent(eventBus, event, result, 'DEFAULT');
    } catch (error) {
      console.warn('TSA timestamp failed for upload.sync_failure:', (error as Error).message);
    }
  });

  eventBus.registerHandler('classification.bulk_complete', 'tsa_classification_bulk_complete', async (event) => {
    try {
      const meta = (event.metadata as Record<string, unknown>) || {};
      const result = await tsaClient.timestampEvent({
        documentCount: meta.documentCount,
        importSource: meta.importSource,
        wbsNodesAffected: meta.wbsNodesAffected,
        projectId: event.projectId || meta.projectId,
        eventId: event.id,
      }, 'COMPLY');
      await logTsaEvent(eventBus, event, result, 'COMPLY');
    } catch (error) {
      console.warn('TSA timestamp failed for classification.bulk_complete:', (error as Error).message);
    }
  });
}
