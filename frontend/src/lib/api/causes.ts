import { USE_MOCK } from "@/lib/config";
import { toCauseDetail } from "@/lib/mock/join";
import { causeCover, causeGallery, causeImage } from "@/lib/mock/images";
import {
  badRequest,
  commit,
  delay,
  forbidden,
  getWorld,
  maybeFailRead,
  nextId,
  notFound,
} from "@/lib/mock/store";
import { pickTrendingCauses } from "@/lib/featured";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
import type {
  Cause,
  CauseDetail,
  CauseDraftPayload,
  CauseStatus,
  ID,
  UserRole,
} from "@/lib/types";
import { PUBLIC_CAUSE_STATUSES } from "@/lib/types";

import { matchesSearch } from "@/lib/utils/search";

import { http } from "./http";

export interface CauseFilters {
  q?: string;
  category?: string[];
  /** Staff only — the public list is always restricted to APPROVED/ACTIVE. */
  status?: CauseStatus[];
  organizerId?: ID;
}

/** GET /causes */
export async function listCauses(
  filters: CauseFilters = {},
): Promise<CauseDetail[]> {
  if (!USE_MOCK) {
    return http<CauseDetail[]>("/causes", {
      query: {
        q: filters.q,
        category: filters.category,
        status: filters.status,
        organizerId: filters.organizerId,
      },
    });
  }

  await delay();
  maybeFailRead("cauzele");
  const world = getWorld();

  return world.causes
    .filter((cause) =>
      filters.status?.length
        ? filters.status.includes(cause.status)
        : PUBLIC_CAUSE_STATUSES.includes(cause.status),
    )
    .filter((cause) =>
      filters.organizerId ? cause.organizerId === filters.organizerId : true,
    )
    .filter((cause) =>
      filters.category?.length
        ? filters.category.includes(cause.category)
        : true,
    )
    .filter((cause) =>
      filters.q
        ? matchesSearch(`${cause.name} ${cause.shortDescription}`, filters.q)
        : true,
    )
    .map(toCauseDetail)
    .sort((a, b) => b.raisedAmount - a.raisedAmount);
}

/** GET /causes/{idOrSlug} */
export async function getCause(idOrSlug: ID): Promise<CauseDetail> {
  if (!USE_MOCK) return http<CauseDetail>(`/causes/${idOrSlug}`);

  await delay();
  maybeFailRead("cauza");
  const world = getWorld();
  const cause = world.causes.find(
    (item) => item.id === idOrSlug || item.slug === idOrSlug,
  );
  if (!cause) notFound("Cauza");
  return toCauseDetail(cause);
}

/** GET /causes/trending — homepage row. */
export async function listTrendingCauses(): Promise<CauseDetail[]> {
  if (!USE_MOCK) return http<CauseDetail[]>("/causes/trending");

  await delay();
  maybeFailRead("cauzele populare");
  const world = getWorld();
  return pickTrendingCauses(world.causes, world.auctions).map(toCauseDetail);
}

/** GET /users/me/causes — any status, including drafts and rejections. */
export async function listMyCauses(userId: ID): Promise<CauseDetail[]> {
  if (!USE_MOCK) return http<CauseDetail[]>("/users/me/causes");

  await delay();
  maybeFailRead("cauzele tale");
  const world = getWorld();
  return world.causes
    .filter((cause) => cause.organizerId === userId)
    .map(toCauseDetail)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * POST /causes — any USER may propose a cause; it still needs staff approval.
 * `submit` decides between saving a draft and entering the operator queue.
 */
export async function createCause(
  payload: CauseDraftPayload,
  organizerId: ID,
  submit: boolean,
): Promise<CauseDetail> {
  if (!USE_MOCK) {
    return http<CauseDetail>("/causes", {
      method: "POST",
      body: { ...payload, submit },
    });
  }

  await delay();
  const world = getWorld();

  if (!payload.name.trim()) badRequest("Cauza are nevoie de un nume.");
  if (payload.goalAmount <= 0) badRequest("Obiectivul trebuie să fie mai mare de 0.");
  if (submit && payload.validation.documents.length === 0) {
    badRequest(
      "Încarcă cel puțin un document de verificare înainte de trimitere.",
      "DOCUMENTS_REQUIRED",
    );
  }

  const id = nextId("cau");
  const now = new Date().toISOString();
  const cause: Cause = {
    id,
    name: payload.name.trim(),
    slug: uniqueSlug(
      slugify(payload.name),
      world.causes.map((item) => item.slug),
    ),
    shortDescription: payload.shortDescription,
    story: payload.story,
    category: payload.category,
    imageUrl: payload.imageUrl ?? causeImage(id, payload.category),
    coverUrl: causeCover(id, payload.category),
    gallery: causeGallery(id, payload.category),
    organizerId,
    status: submit ? "PENDING_APPROVAL" : "DRAFT",
    validation: {
      ...payload.validation,
      documents: payload.validation.documents.map((document, index) => ({
        ...document,
        id: `${id}_doc_${index}`,
        uploadedAt: now,
      })),
    },
    goalAmount: payload.goalAmount,
    raisedAmount: 0,
    supporterCount: 0,
    createdAt: now,
    submittedAt: submit ? now : undefined,
  };

  world.causes.push(cause);
  commit();
  return toCauseDetail(cause);
}

/** POST /causes/{id}/submit — moves a draft into the approval queue. */
export async function submitCause(
  causeId: ID,
  userId: ID,
): Promise<CauseDetail> {
  if (!USE_MOCK) {
    return http<CauseDetail>(`/causes/${causeId}/submit`, { method: "POST" });
  }

  await delay();
  const world = getWorld();
  const cause = world.causes.find((item) => item.id === causeId);
  if (!cause) notFound("Cauza");
  if (cause.organizerId !== userId) forbidden("Nu este cauza ta.");
  if (cause.validation.documents.length === 0) {
    badRequest("Încarcă documentele de verificare înainte de trimitere.");
  }

  cause.status = "PENDING_APPROVAL";
  cause.submittedAt = new Date().toISOString();
  cause.rejectionReason = undefined;
  commit();
  return toCauseDetail(cause);
}

/* ---------------------------------------------------------------------------
 * Staff actions — OPERATOR and ADMIN
 * ------------------------------------------------------------------------ */

function assertStaff(role: UserRole): void {
  if (role !== "OPERATOR" && role !== "ADMIN") {
    forbidden("Nu ai drepturi pentru această acțiune.");
  }
}

/** GET /operator/causes?status=PENDING_APPROVAL */
export async function listCauseQueue(role: UserRole): Promise<CauseDetail[]> {
  if (!USE_MOCK) return http<CauseDetail[]>("/operator/causes");

  await delay();
  assertStaff(role);
  maybeFailRead("coada de aprobare");
  const world = getWorld();

  const order: CauseStatus[] = [
    "PENDING_APPROVAL",
    "ACTIVE",
    "APPROVED",
    "SUSPENDED",
    "REJECTED",
    "DRAFT",
  ];

  return world.causes
    .map(toCauseDetail)
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
}

/** POST /operator/causes/{id}/approve */
export async function approveCause(
  causeId: ID,
  role: UserRole,
): Promise<CauseDetail> {
  if (!USE_MOCK) {
    return http<CauseDetail>(`/operator/causes/${causeId}/approve`, {
      method: "POST",
    });
  }

  await delay();
  assertStaff(role);
  const world = getWorld();
  const cause = world.causes.find((item) => item.id === causeId);
  if (!cause) notFound("Cauza");

  cause.status = "ACTIVE";
  cause.approvedAt = new Date().toISOString();
  cause.rejectionReason = undefined;
  commit();
  return toCauseDetail(cause);
}

/** POST /operator/causes/{id}/reject */
export async function rejectCause(
  causeId: ID,
  reason: string,
  role: UserRole,
): Promise<CauseDetail> {
  if (!USE_MOCK) {
    return http<CauseDetail>(`/operator/causes/${causeId}/reject`, {
      method: "POST",
      body: { reason },
    });
  }

  await delay();
  assertStaff(role);
  if (!reason.trim()) {
    badRequest(
      "Scrie un motiv, ca organizatorul să știe ce are de corectat.",
    );
  }

  const world = getWorld();
  const cause = world.causes.find((item) => item.id === causeId);
  if (!cause) notFound("Cauza");

  cause.status = "REJECTED";
  cause.rejectionReason = reason.trim();
  commit();
  return toCauseDetail(cause);
}

/** POST /admin/causes/{id}/suspend — ADMIN may override an operator decision. */
export async function setCauseStatus(
  causeId: ID,
  status: CauseStatus,
  role: UserRole,
): Promise<CauseDetail> {
  if (!USE_MOCK) {
    return http<CauseDetail>(`/admin/causes/${causeId}/status`, {
      method: "PUT",
      body: { status },
    });
  }

  await delay();
  if (role !== "ADMIN") forbidden("Doar administratorii pot face asta.");

  const world = getWorld();
  const cause = world.causes.find((item) => item.id === causeId);
  if (!cause) notFound("Cauza");

  cause.status = status;
  commit();
  return toCauseDetail(cause);
}
