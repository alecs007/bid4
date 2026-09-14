import { USE_MOCK } from "@/lib/config";
import { toDisputeDetail } from "@/lib/mock/join";
import {
  badRequest,
  commit,
  completeOrder,
  delay,
  forbidden,
  getWorld,
  maybeFailRead,
  nextId,
  notFound,
  pushEvent,
} from "@/lib/mock/store";
import type {
  Dispute,
  DisputeDetail,
  ID,
  OpenDisputePayload,
  ResolveDisputePayload,
  UserRole,
} from "@/lib/types";

import { http } from "./http";

// TODO(backend): resolving one triggers the Stripe refund, or the transfers a release makes.
export async function openDispute(
  payload: OpenDisputePayload,
  userId: ID,
): Promise<DisputeDetail> {
  if (!USE_MOCK) {
    return http<DisputeDetail>(`/orders/${payload.orderId}/disputes`, {
      method: "POST",
      body: payload,
    });
  }

  await delay();
  const world = getWorld();
  const order = world.orders.find((item) => item.id === payload.orderId);
  if (!order) notFound("Comanda");
  if (order.buyerId !== userId) {
    forbidden("Doar cumpărătorul poate deschide o dispută.");
  }
  if (order.status === "COMPLETED") {
    badRequest(
      "Comanda este finalizată, iar fondurile au fost deja eliberate. Scrie-ne la ajutor@bid4.ro.",
    );
  }
  if (!payload.description.trim()) {
    badRequest("Descrie problema, ca operatorul să poată interveni.");
  }

  const dispute: Dispute = {
    id: nextId("dsp"),
    orderId: order.id,
    orderReference: order.reference,
    openedBy: userId,
    reason: payload.reason,
    description: payload.description.trim(),
    evidenceUrls: payload.evidenceUrls ?? [],
    status: "OPEN",
    createdAt: new Date().toISOString(),
  };

  world.disputes.push(dispute);
  pushEvent(
    order,
    "DISPUTE_OPEN",
    "Dispută deschisă. Eliberarea fondurilor este blocată.",
  );
  commit();

  const detail = toDisputeDetail(dispute);
  if (!detail) notFound("Disputa");
  return detail;
}

export async function listDisputes(role: UserRole): Promise<DisputeDetail[]> {
  if (!USE_MOCK) return http<DisputeDetail[]>("/operator/disputes");

  await delay();
  if (role !== "OPERATOR" && role !== "ADMIN") {
    forbidden("Nu ai drepturi pentru această zonă.");
  }
  maybeFailRead("disputele");
  const world = getWorld();

  const openFirst = (dispute: Dispute) =>
    dispute.status === "OPEN" ? 0 : dispute.status === "UNDER_REVIEW" ? 1 : 2;

  return world.disputes
    .map(toDisputeDetail)
    .filter((item): item is DisputeDetail => item !== null)
    .sort(
      (a, b) =>
        openFirst(a) - openFirst(b) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
}

export async function getDisputeForOrder(
  orderId: ID,
): Promise<DisputeDetail | null> {
  if (!USE_MOCK) {
    return http<DisputeDetail | null>(`/orders/${orderId}/disputes`);
  }

  await delay();
  const world = getWorld();
  const dispute = world.disputes.find((item) => item.orderId === orderId);
  return dispute ? toDisputeDetail(dispute) : null;
}

export async function claimDispute(
  disputeId: ID,
  operatorId: ID,
  role: UserRole,
): Promise<DisputeDetail> {
  if (!USE_MOCK) {
    return http<DisputeDetail>(`/operator/disputes/${disputeId}/claim`, {
      method: "POST",
    });
  }

  await delay();
  if (role !== "OPERATOR" && role !== "ADMIN") forbidden("Nu ai drepturi.");
  const world = getWorld();
  const dispute = world.disputes.find((item) => item.id === disputeId);
  if (!dispute) notFound("Disputa");

  dispute.status = "UNDER_REVIEW";
  dispute.operatorId = operatorId;
  commit();

  const detail = toDisputeDetail(dispute);
  if (!detail) notFound("Disputa");
  return detail;
}

export async function resolveDispute(
  payload: ResolveDisputePayload,
  operatorId: ID,
  role: UserRole,
): Promise<DisputeDetail> {
  if (!USE_MOCK) {
    return http<DisputeDetail>(
      `/operator/disputes/${payload.disputeId}/resolve`,
      { method: "POST", body: payload },
    );
  }

  await delay();
  if (role !== "OPERATOR" && role !== "ADMIN") forbidden("Nu ai drepturi.");
  if (!payload.resolutionNote.trim()) {
    badRequest("Adaugă o motivare. Ambele părți o vor putea consulta.");
  }

  const world = getWorld();
  const dispute = world.disputes.find((item) => item.id === payload.disputeId);
  if (!dispute) notFound("Disputa");
  const order = world.orders.find((item) => item.id === dispute.orderId);
  if (!order) notFound("Comanda");

  if (
    payload.resolution === "RESOLVED_PARTIAL" &&
    (!payload.refundAmount || payload.refundAmount <= 0)
  ) {
    badRequest("Completează suma returnată cumpărătorului.");
  }

  dispute.status = payload.resolution;
  dispute.operatorId = operatorId;
  dispute.resolutionNote = payload.resolutionNote.trim();
  dispute.refundAmount = payload.refundAmount;
  dispute.resolvedAt = new Date().toISOString();

  switch (payload.resolution) {
    case "RESOLVED_REFUND":
      pushEvent(order, "DISPUTE_RESOLVED", dispute.resolutionNote);
      pushEvent(
        order,
        "REFUNDED",
        "Suma a fost rambursată integral cumpărătorului.",
      );
      break;

    case "RESOLVED_RELEASE":
      pushEvent(order, "DISPUTE_RESOLVED", dispute.resolutionNote);
      completeOrder(
        order,
        "Dispută respinsă. Fondurile au fost eliberate către cauză și vânzător.",
      );
      break;

    case "RESOLVED_PARTIAL":
      pushEvent(order, "DISPUTE_RESOLVED", dispute.resolutionNote);
      completeOrder(
        order,
        "Rezolvare parțială. Diferența a fost eliberată către cauză și vânzător.",
      );
      break;
  }

  commit();
  const detail = toDisputeDetail(dispute);
  if (!detail) notFound("Disputa");
  return detail;
}
