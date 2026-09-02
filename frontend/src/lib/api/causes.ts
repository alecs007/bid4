import { CAUSE, USE_MOCK } from "@/lib/config";
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
  CauseApplicationDraft,
  CauseApplicationPayload,
  CauseDetail,
  CauseDocument,
  CauseDraftRecord,
  CauseStatus,
  ID,
  UploadedFileRef,
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
    const answer = await http<CauseDetail[]>("/causes", {
      query: {
        q: filters.q,
        category: filters.category,
        status: filters.status,
        organizerId: filters.organizerId,
      },
    });

    // TODO(backend): CauseController.list takes q, category and limit, and
    // nothing else — organizerId rides along in the query string and is
    // dropped. Until it is a parameter there, a caller asking for one member's
    // causes was being handed the platform's, which is what made every public
    // profile look like it ran three of them. Narrowed here rather than left
    // wrong, and the mock already filters, so this is a no-op against it.
    return filters.organizerId
      ? answer.filter((cause) => cause.organizer.id === filters.organizerId)
      : answer;
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
 * The identity paperwork restated as the flat document list the review queue
 * expects; the application itself keeps each file next to what it belongs to.
 */
function validationDocuments(
  payload: CauseApplicationPayload,
  causeId: ID,
  now: string,
): CauseDocument[] {
  const entries: { kind: CauseDocument["kind"]; file?: UploadedFileRef }[] = [
    { kind: "ID_DOCUMENT", file: payload.beneficiary.idDocumentRef },
    { kind: "ID_DOCUMENT", file: payload.guardian?.idDocumentRef },
    { kind: "OTHER", file: payload.guardian?.guardianshipProofRef },
    { kind: "STATUTE", file: payload.ngo?.statuteDocRef },
    { kind: "ID_DOCUMENT", file: payload.ngo?.representativeIdRef },
  ];

  return entries
    .filter((entry): entry is { kind: CauseDocument["kind"]; file: UploadedFileRef } =>
      Boolean(entry.file),
    )
    .map((entry, index) => ({
      id: `${causeId}_kyc_${index}`,
      kind: entry.kind,
      fileName: entry.file.fileName,
      fileUrl: entry.file.fileRef,
      sizeBytes: entry.file.sizeBytes,
      uploadedAt: now,
    }));
}

/**
 * POST /causes — any USER may propose a cause; it still needs staff approval.
 * `submit` decides between parking a draft and entering the operator queue.
 *
 * TODO(backend): the server re-validates everything. Nothing a browser says about
 * identity may be trusted, least of all that a document was seen.
 */
export async function createCause(
  payload: CauseApplicationPayload,
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
  if (payload.goalAmount <= 0) {
    badRequest("Obiectivul trebuie să fie mai mare de 0.");
  }
  if (submit && payload.documents.length < CAUSE.MIN_DOCUMENTS) {
    badRequest(
      "Încarcă cel puțin un document justificativ înainte de trimitere.",
      "DOCUMENTS_REQUIRED",
    );
  }
  if (submit && payload.beneficiaryType === "MINOR" && !payload.guardian) {
    badRequest(
      "O cauză pentru un minor are nevoie de un tutore legal verificat.",
      "GUARDIAN_REQUIRED",
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
    imageUrl: payload.coverImage?.previewUrl ?? causeImage(id, payload.category),
    coverUrl: payload.coverImage?.previewUrl ?? causeCover(id, payload.category),
    gallery: payload.gallery.length
      ? payload.gallery.map((image) => image.previewUrl ?? image.fileRef)
      : causeGallery(id, payload.category),

    organizerId,
    status: submit ? "PENDING_APPROVAL" : "DRAFT",
    validation: {
      legalName: payload.ngo?.legalName ?? payload.beneficiary.fullName,
      registrationNumber: payload.ngo?.registrationNumber ?? "",
      representativeName:
        payload.ngo?.representativeName ??
        payload.guardian?.fullName ??
        payload.beneficiary.fullName,
      contactEmail: payload.beneficiary.contactEmail,
      contactPhone: payload.beneficiary.contactPhone,
      payoutAccountRef: payload.payout.iban ?? "",
      documents: validationDocuments(payload, id, now),
    },

    beneficiaryType: payload.beneficiaryType,
    beneficiary: payload.beneficiary,
    guardian: payload.guardian,
    ngo: payload.ngo,
    documents: payload.documents.map((document, index) => ({
      ...document,
      id: `${id}_doc_${index}`,
    })),
    payout: payload.payout,
    verification: {
      status: submit ? "PENDING_APPROVAL" : "UNVERIFIED",
      cap: CAUSE.UNVERIFIED_CAP,
    },
    consents: { ...payload.consents, acceptedAt: now },

    goalAmount: payload.goalAmount,
    raisedAmount: 0,
    supporterCount: 0,
    deadline: payload.deadline,
    createdAt: now,
    submittedAt: submit ? now : undefined,
  };

  world.causes.push(cause);
  world.causeDrafts = world.causeDrafts.filter(
    (draft) => draft.organizerId !== organizerId,
  );
  commit();
  return toCauseDetail(cause);
}

/**
 * POST /causes/draft — one open draft per organiser, so this upserts rather than
 * appends.
 */
export async function saveDraftCause(
  data: CauseApplicationDraft,
  step: number,
  organizerId: ID,
): Promise<CauseDraftRecord> {
  if (!USE_MOCK) {
    return http<CauseDraftRecord>("/causes/draft", {
      method: "POST",
      body: { data, step },
    });
  }

  const world = getWorld();
  const now = new Date().toISOString();
  const existing = world.causeDrafts.find(
    (draft) => draft.organizerId === organizerId,
  );

  if (existing) {
    existing.data = data;
    existing.step = Math.max(existing.step, step);
    existing.updatedAt = now;
    commit();
    return existing;
  }

  const record: CauseDraftRecord = {
    id: nextId("cdr"),
    organizerId,
    step,
    data,
    updatedAt: now,
  };
  world.causeDrafts.push(record);
  commit();
  return record;
}

/** GET /causes/draft — what to resume, if anything. */
export async function getMyCauseDraft(
  organizerId: ID,
): Promise<CauseDraftRecord | null> {
  if (!USE_MOCK) {
    return http<CauseDraftRecord | null>("/causes/draft");
  }

  await delay();
  const world = getWorld();
  return (
    world.causeDrafts.find((draft) => draft.organizerId === organizerId) ?? null
  );
}

/** DELETE /causes/draft */
export async function discardCauseDraft(organizerId: ID): Promise<void> {
  if (!USE_MOCK) {
    await http<void>("/causes/draft", { method: "DELETE" });
    return;
  }

  const world = getWorld();
  world.causeDrafts = world.causeDrafts.filter(
    (draft) => draft.organizerId !== organizerId,
  );
  commit();
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
      "Adaugă un motiv, pentru ca organizatorul să știe ce are de corectat.",
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
  if (role !== "ADMIN") forbidden("Această acțiune este permisă doar administratorilor.");

  const world = getWorld();
  const cause = world.causes.find((item) => item.id === causeId);
  if (!cause) notFound("Cauza");

  cause.status = status;
  commit();
  return toCauseDetail(cause);
}
