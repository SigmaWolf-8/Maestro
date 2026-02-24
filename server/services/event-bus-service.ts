import { db } from "../db";
import {
  documentEvents,
  eventSubscribers,
  eventDeadLetters,
  type DocumentEvent,
  type EventSubscriber,
  type EventDeadLetter,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

type HandlerFn = (event: DocumentEvent) => Promise<void>;

interface HandlerEntry {
  name: string;
  fn: HandlerFn;
}

interface PublishParams {
  tenantId: string;
  eventType: string;
  documentId?: string;
  projectId?: string;
  userId?: string;
  wbsNodeId?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

interface SubscribeParams {
  tenantId: string;
  eventType: string;
  subscriberName: string;
  handlerPath: string;
  priority?: number;
  filterConditions?: Record<string, unknown>;
}

interface EventFilters {
  eventType?: string;
  documentId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

interface DeadLetterFilters {
  unresolvedOnly?: boolean;
  limit?: number;
}

export class EventBusService {
  private handlers: Map<string, HandlerEntry[]> = new Map();

  async publish(event: PublishParams): Promise<DocumentEvent> {
    const id = randomUUID();
    const [persisted] = await db
      .insert(documentEvents)
      .values({
        id,
        tenantId: event.tenantId,
        eventType: event.eventType,
        documentId: event.documentId ?? null,
        projectId: event.projectId ?? null,
        userId: event.userId ?? null,
        wbsNodeId: event.wbsNodeId ?? null,
        payload: event.payload ?? {},
        metadata: event.metadata ?? {},
        correlationId: event.correlationId ?? null,
      })
      .returning();

    await this.dispatch(persisted);

    return persisted;
  }

  async subscribe(subscriber: SubscribeParams): Promise<EventSubscriber> {
    const id = randomUUID();
    const [created] = await db
      .insert(eventSubscribers)
      .values({
        id,
        tenantId: subscriber.tenantId,
        eventType: subscriber.eventType,
        subscriberName: subscriber.subscriberName,
        handlerPath: subscriber.handlerPath,
        priority: subscriber.priority ?? 0,
        filterConditions: subscriber.filterConditions ?? {},
        isActive: true,
      })
      .returning();

    return created;
  }

  async unsubscribe(subscriberId: string): Promise<void> {
    await db
      .update(eventSubscribers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(eventSubscribers.id, subscriberId));
  }

  async getEvents(tenantId: string, filters?: EventFilters): Promise<DocumentEvent[]> {
    const limit = filters?.limit ?? 100;
    const conditions = [eq(documentEvents.tenantId, tenantId)];

    if (filters?.eventType) {
      conditions.push(eq(documentEvents.eventType, filters.eventType));
    }
    if (filters?.documentId) {
      conditions.push(eq(documentEvents.documentId, filters.documentId));
    }
    if (filters?.projectId) {
      conditions.push(eq(documentEvents.projectId, filters.projectId));
    }

    let rows = await db
      .select()
      .from(documentEvents)
      .where(and(...conditions))
      .orderBy(desc(documentEvents.createdAt))
      .limit(limit);

    if (filters?.startDate) {
      rows = rows.filter((r) => r.createdAt && r.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      rows = rows.filter((r) => r.createdAt && r.createdAt <= filters.endDate!);
    }

    return rows;
  }

  async getEventsByCorrelation(correlationId: string): Promise<DocumentEvent[]> {
    return db
      .select()
      .from(documentEvents)
      .where(eq(documentEvents.correlationId, correlationId))
      .orderBy(desc(documentEvents.createdAt));
  }

  async getEventById(eventId: string): Promise<DocumentEvent | undefined> {
    const [event] = await db
      .select()
      .from(documentEvents)
      .where(eq(documentEvents.id, eventId))
      .limit(1);
    return event;
  }

  async recordDeadLetter(
    eventId: string,
    subscriberId: string,
    errorMessage: string
  ): Promise<EventDeadLetter> {
    const event = await this.getEventById(eventId);
    const tenantId = event?.tenantId ?? "";
    const id = randomUUID();
    const [dl] = await db
      .insert(eventDeadLetters)
      .values({
        id,
        tenantId,
        eventId,
        subscriberId,
        errorMessage,
        retryCount: 0,
        maxRetries: 3,
      })
      .returning();
    return dl;
  }

  async getDeadLetters(tenantId: string, filters?: DeadLetterFilters): Promise<EventDeadLetter[]> {
    const conditions = [eq(eventDeadLetters.tenantId, tenantId)];

    let rows = await db
      .select()
      .from(eventDeadLetters)
      .where(and(...conditions))
      .orderBy(desc(eventDeadLetters.createdAt))
      .limit(filters?.limit ?? 100);

    if (filters?.unresolvedOnly) {
      rows = rows.filter((r) => r.resolvedAt === null);
    }

    return rows;
  }

  async retryDeadLetter(deadLetterId: string): Promise<void> {
    const [dl] = await db
      .select()
      .from(eventDeadLetters)
      .where(eq(eventDeadLetters.id, deadLetterId))
      .limit(1);

    if (!dl) return;

    await db
      .update(eventDeadLetters)
      .set({
        retryCount: (dl.retryCount ?? 0) + 1,
        lastRetryAt: new Date(),
      })
      .where(eq(eventDeadLetters.id, deadLetterId));

    const event = await this.getEventById(dl.eventId);
    if (!event) return;

    const [subscriber] = await db
      .select()
      .from(eventSubscribers)
      .where(eq(eventSubscribers.id, dl.subscriberId))
      .limit(1);

    if (!subscriber) return;

    const handlerEntries = this.handlers.get(event.eventType) ?? [];
    const match = handlerEntries.find((h) => h.name === subscriber.subscriberName);
    if (match) {
      try {
        await match.fn(event);
        await db
          .update(eventDeadLetters)
          .set({ resolvedAt: new Date() })
          .where(eq(eventDeadLetters.id, deadLetterId));
      } catch {
        // retry failed, dead letter remains unresolved
      }
    }
  }

  async resolveDeadLetter(deadLetterId: string): Promise<void> {
    await db
      .update(eventDeadLetters)
      .set({ resolvedAt: new Date() })
      .where(eq(eventDeadLetters.id, deadLetterId));
  }

  async getSubscribers(tenantId: string, eventType?: string): Promise<EventSubscriber[]> {
    const conditions = [
      eq(eventSubscribers.tenantId, tenantId),
      eq(eventSubscribers.isActive, true),
    ];

    if (eventType) {
      conditions.push(eq(eventSubscribers.eventType, eventType));
    }

    return db
      .select()
      .from(eventSubscribers)
      .where(and(...conditions));
  }

  async getSubscribersByEvent(eventType: string): Promise<EventSubscriber[]> {
    return db
      .select()
      .from(eventSubscribers)
      .where(
        and(
          eq(eventSubscribers.eventType, eventType),
          eq(eventSubscribers.isActive, true)
        )
      );
  }

  registerHandler(eventType: string, handlerName: string, handlerFn: HandlerFn): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push({ name: handlerName, fn: handlerFn });
    this.handlers.set(eventType, existing);
  }

  async replayEvents(
    tenantId: string,
    subscriberName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ replayed: number; failed: number }> {
    const subscribers = await db
      .select()
      .from(eventSubscribers)
      .where(
        and(
          eq(eventSubscribers.tenantId, tenantId),
          eq(eventSubscribers.subscriberName, subscriberName),
          eq(eventSubscribers.isActive, true)
        )
      );

    if (subscribers.length === 0) {
      return { replayed: 0, failed: 0 };
    }

    const subscriber = subscribers[0];
    const eventTypes = subscribers.map((s) => s.eventType);

    let events = await db
      .select()
      .from(documentEvents)
      .where(eq(documentEvents.tenantId, tenantId))
      .orderBy(desc(documentEvents.createdAt));

    events = events.filter((e) => eventTypes.includes(e.eventType));

    if (startDate) {
      events = events.filter((e) => e.createdAt && e.createdAt >= startDate);
    }
    if (endDate) {
      events = events.filter((e) => e.createdAt && e.createdAt <= endDate);
    }

    let replayed = 0;
    let failed = 0;

    const handlerEntries = this.handlers.get(subscriber.eventType) ?? [];
    const match = handlerEntries.find((h) => h.name === subscriberName);

    for (const event of events) {
      const eventHandlers = this.handlers.get(event.eventType) ?? [];
      const handler = eventHandlers.find((h) => h.name === subscriberName) ?? match;

      if (!handler) {
        continue;
      }

      try {
        await handler.fn(event);
        replayed++;
      } catch (err: unknown) {
        failed++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        await this.recordDeadLetter(event.id, subscriber.id, errorMessage);
      }
    }

    return { replayed, failed };
  }

  private async dispatch(event: DocumentEvent): Promise<void> {
    const handlerEntries = this.handlers.get(event.eventType) ?? [];

    for (const entry of handlerEntries) {
      try {
        await entry.fn(event);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const dbSubscribers = await this.getSubscribersByEvent(event.eventType);
        const matchingSub = dbSubscribers.find((s) => s.subscriberName === entry.name);
        if (matchingSub) {
          await this.recordDeadLetter(event.id, matchingSub.id, errorMessage);
        }
      }
    }
  }
}

export const eventBus = new EventBusService();
