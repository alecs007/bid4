import { USE_MOCK } from "@/lib/config";
import { delay, getWorld, maybeFailRead, notFound } from "@/lib/mock/store";
import type { ID, Invoice, InvoiceFilters, UserRole } from "@/lib/types";

import { http } from "./http";

// TODO(backend): PDFs are rendered server-side and served behind a signed URL.
export async function listInvoices(
  userId: ID,
  filters: InvoiceFilters = {},
): Promise<Invoice[]> {
  if (!USE_MOCK) {
    return http<Invoice[]>("/users/me/invoices", {
      query: { type: filters.type, year: filters.year, q: filters.q },
    });
  }

  await delay();
  maybeFailRead("facturile");
  const world = getWorld();

  return world.invoices
    .filter((invoice) => invoice.issuedToUserId === userId)
    .filter((invoice) =>
      filters.type?.length ? filters.type.includes(invoice.type) : true,
    )
    .filter((invoice) =>
      filters.year
        ? new Date(invoice.createdAt).getFullYear() === filters.year
        : true,
    )
    .filter((invoice) =>
      filters.q
        ? `${invoice.number} ${invoice.orderReference}`
            .toLowerCase()
            .includes(filters.q.toLowerCase())
        : true,
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getInvoice(
  invoiceId: ID,
  viewerId: ID,
): Promise<Invoice> {
  if (!USE_MOCK) return http<Invoice>(`/invoices/${invoiceId}`);

  await delay();
  const world = getWorld();
  const invoice = world.invoices.find((item) => item.id === invoiceId);
  if (!invoice) notFound("Factura");

  const viewer = world.users.find((item) => item.id === viewerId);
  const isStaff = viewer?.role === "OPERATOR" || viewer?.role === "ADMIN";
  if (invoice.issuedToUserId !== viewerId && !isStaff) {
    notFound("Factura");
  }
  return invoice;
}

export async function listAllInvoices(role: UserRole): Promise<Invoice[]> {
  if (!USE_MOCK) return http<Invoice[]>("/admin/invoices");

  await delay();
  if (role !== "ADMIN") notFound("Facturile");
  const world = getWorld();
  return [...world.invoices].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}
