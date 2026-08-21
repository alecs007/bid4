import { USE_MOCK } from "@/lib/config";
import { publicUserById, toPublicUser } from "@/lib/mock/join";
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
import type {
  DeliveryMethod,
  ID,
  PublicUser,
  User,
  UserRole,
  UserStatus,
} from "@/lib/types";

import { http } from "./http";

export interface PublicProfile {
  user: PublicUser;
  /** Denormalised counters the profile header shows. */
  activeAuctionCount: number;
  completedSaleCount: number;
  causeCount: number;
}

/** GET /users/{username} — the public profile page. */
export async function getPublicProfile(
  username: string,
): Promise<PublicProfile> {
  if (!USE_MOCK) return http<PublicProfile>(`/users/${username}`);

  await delay();
  maybeFailRead("profilul");
  const world = getWorld();
  const user = world.users.find((item) => item.username === username);
  if (!user) notFound("Profilul");

  return {
    user: toPublicUser(user),
    activeAuctionCount: world.auctions.filter(
      (auction) =>
        auction.sellerId === user.id &&
        (auction.status === "LIVE" || auction.status === "SCHEDULED"),
    ).length,
    completedSaleCount: world.orders.filter(
      (order) => order.sellerId === user.id && order.status === "COMPLETED",
    ).length,
    causeCount: world.causes.filter(
      (cause) =>
        cause.organizerId === user.id &&
        (cause.status === "ACTIVE" || cause.status === "APPROVED"),
    ).length,
  };
}

/** PATCH /users/me */
export async function updateProfile(
  userId: ID,
  changes: Partial<
    Pick<
      User,
      "displayName" | "bio" | "city" | "orgLegalName" | "orgRegistrationNumber"
    >
  >,
): Promise<User> {
  if (!USE_MOCK) {
    return http<User>("/users/me", { method: "PATCH", body: changes });
  }

  await delay();
  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  if (!user) notFound("Utilizatorul");

  if (changes.displayName !== undefined && !changes.displayName.trim()) {
    badRequest("Numele afișat nu poate fi gol.");
  }

  Object.assign(user, changes);
  commit();
  return user;
}

/* ---------------------------------------------------------------------------
 * Delivery methods — one of the two gates that unlock bidding
 * ------------------------------------------------------------------------ */

/** GET /users/me/delivery-methods */
export async function listDeliveryMethods(
  userId: ID,
): Promise<DeliveryMethod[]> {
  if (!USE_MOCK) return http<DeliveryMethod[]>("/users/me/delivery-methods");

  await delay();
  maybeFailRead("metodele de livrare");
  const world = getWorld();
  return world.deliveryMethods
    .filter((method) => method.userId === userId)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/** POST /users/me/delivery-methods */
export async function addDeliveryMethod(
  userId: ID,
  method: Omit<DeliveryMethod, "id" | "userId">,
): Promise<DeliveryMethod> {
  if (!USE_MOCK) {
    return http<DeliveryMethod>("/users/me/delivery-methods", {
      method: "POST",
      body: method,
    });
  }

  await delay();
  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  if (!user) notFound("Utilizatorul");

  if (method.type === "EASYBOX" && !method.easyboxLockerId) {
    badRequest("Alege un locker Easybox.");
  }
  if (method.type === "HOME_COURIER" && !method.homeAddress?.street) {
    badRequest("Completează adresa de livrare.");
  }
  if (!method.phone.trim()) badRequest("Curierul are nevoie de un telefon.");

  const created: DeliveryMethod = {
    ...method,
    id: nextId("dlv"),
    userId,
  };

  const isFirst = !world.deliveryMethods.some((item) => item.userId === userId);
  if (created.isDefault || isFirst) {
    world.deliveryMethods
      .filter((item) => item.userId === userId)
      .forEach((item) => {
        item.isDefault = false;
      });
    created.isDefault = true;
    user.defaultDeliveryMethodId = created.id;
  }

  world.deliveryMethods.push(created);
  commit();
  return created;
}

/** PUT /users/me/delivery-methods/{id}/default */
export async function setDefaultDeliveryMethod(
  userId: ID,
  methodId: ID,
): Promise<DeliveryMethod[]> {
  if (!USE_MOCK) {
    return http<DeliveryMethod[]>(
      `/users/me/delivery-methods/${methodId}/default`,
      { method: "PUT" },
    );
  }

  await delay();
  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  const target = world.deliveryMethods.find(
    (item) => item.id === methodId && item.userId === userId,
  );
  if (!user || !target) notFound("Metoda de livrare");

  world.deliveryMethods
    .filter((item) => item.userId === userId)
    .forEach((item) => {
      item.isDefault = item.id === methodId;
    });
  user.defaultDeliveryMethodId = methodId;
  commit();

  return world.deliveryMethods.filter((item) => item.userId === userId);
}

/** DELETE /users/me/delivery-methods/{id} */
export async function removeDeliveryMethod(
  userId: ID,
  methodId: ID,
): Promise<void> {
  if (!USE_MOCK) {
    await http<void>(`/users/me/delivery-methods/${methodId}`, {
      method: "DELETE",
    });
    return;
  }

  await delay();
  const world = getWorld();
  const index = world.deliveryMethods.findIndex(
    (item) => item.id === methodId && item.userId === userId,
  );
  if (index < 0) notFound("Metoda de livrare");

  const [removed] = world.deliveryMethods.splice(index, 1);
  const user = world.users.find((item) => item.id === userId);

  // Promote another method so the user does not silently lose the bid gate.
  if (removed?.isDefault && user) {
    const next = world.deliveryMethods.find((item) => item.userId === userId);
    if (next) {
      next.isDefault = true;
      user.defaultDeliveryMethodId = next.id;
    } else {
      user.defaultDeliveryMethodId = undefined;
    }
  }
  commit();
}

/* ---------------------------------------------------------------------------
 * Admin — user and role management (ADMIN only)
 * ------------------------------------------------------------------------ */

function assertAdmin(role: UserRole): void {
  if (role !== "ADMIN") forbidden("Doar administratorii au acces aici.");
}

/** GET /admin/users */
export async function listUsers(
  role: UserRole,
  query = "",
): Promise<User[]> {
  if (!USE_MOCK) return http<User[]>("/admin/users", { query: { q: query } });

  await delay();
  assertAdmin(role);
  maybeFailRead("utilizatorii");
  const world = getWorld();

  const needle = query.trim().toLowerCase();
  return world.users
    .filter((user) =>
      needle
        ? `${user.displayName} ${user.email} ${user.username}`
            .toLowerCase()
            .includes(needle)
        : true,
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** PUT /admin/users/{id}/role */
export async function setUserRole(
  targetId: ID,
  newRole: UserRole,
  actorRole: UserRole,
): Promise<User> {
  if (!USE_MOCK) {
    return http<User>(`/admin/users/${targetId}/role`, {
      method: "PUT",
      body: { role: newRole },
    });
  }

  await delay();
  assertAdmin(actorRole);
  const world = getWorld();
  const user = world.users.find((item) => item.id === targetId);
  if (!user) notFound("Utilizatorul");

  user.role = newRole;
  commit();
  return user;
}

/** PUT /admin/users/{id}/status */
export async function setUserStatus(
  targetId: ID,
  status: UserStatus,
  actorRole: UserRole,
): Promise<User> {
  if (!USE_MOCK) {
    return http<User>(`/admin/users/${targetId}/status`, {
      method: "PUT",
      body: { status },
    });
  }

  await delay();
  assertAdmin(actorRole);
  const world = getWorld();
  const user = world.users.find((item) => item.id === targetId);
  if (!user) notFound("Utilizatorul");
  if (user.role === "ADMIN" && status === "SUSPENDED") {
    badRequest("Un administrator nu poate fi suspendat din interfață.");
  }

  user.status = status;
  commit();
  return user;
}

export { publicUserById };
