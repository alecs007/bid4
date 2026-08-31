import { describe, expect, it } from "vitest";

import { SITE_URL } from "@/lib/config";
import {
  auctionSchema,
  breadcrumbSchema,
  causeSchema,
  organizationSchema,
  websiteSchema,
} from "./structured-data";

/**
 * Structured data is read by a machine that never complains: a wrong field is
 * not an error, it is a rich result that quietly never appears. So the tests
 * are about the things that fail silently — a relative image URL, a price in
 * bani where lei were meant, a field invented for a value we do not have.
 */
const listing = {
  id: "a1",
  title: "Aparat foto Canon AE-1",
  description: "Funcțional, cu obiectiv 50mm.",
  images: ["/images/products/canon.webp", "https://cdn.example.com/2.jpg"],
  category: "electronice",
  condition: "VERY_GOOD",
  currentPrice: 125_050,
  status: "LIVE",
  seller: { displayName: "Maria Ionescu", username: "maria", accountType: "INDIVIDUAL" },
};

describe("auctionSchema", () => {
  it("prices in lei, not in bani", () => {
    const offer = auctionSchema(listing).offers as Record<string, unknown>;
    expect(offer.price).toBe("1250.50");
    expect(offer.priceCurrency).toBe("RON");
  });

  it("makes every image absolute", () => {
    const images = auctionSchema(listing).image as string[];
    for (const image of images) {
      expect(image.startsWith("http")).toBe(true);
    }
    expect(images[0]).toBe(`${SITE_URL}/images/products/canon.webp`);
    // one that was already absolute is left alone rather than doubled
    expect(images[1]).toBe("https://cdn.example.com/2.jpg");
  });

  it("says an auction is still open only while it is", () => {
    const availability = (status: string) =>
      (auctionSchema({ ...listing, status }).offers as Record<string, unknown>)
        .availability;
    expect(availability("LIVE")).toBe("https://schema.org/InStock");
    // Spoken for but unpaid: not orderable by anyone else, and not yet sold.
    expect(availability("RESERVED")).toBe("https://schema.org/BackOrder");
    expect(availability("SOLD")).toBe("https://schema.org/SoldOut");
    expect(availability("CANCELLED")).toBe("https://schema.org/Discontinued");
  });

  it("names the seller as what they are", () => {
    const person = auctionSchema(listing).offers as Record<string, unknown>;
    expect((person.seller as Record<string, unknown>)["@type"]).toBe("Person");

    const org = auctionSchema({
      ...listing,
      seller: { displayName: "Asociația Zâmbet", accountType: "ORGANIZATION" },
    }).offers as Record<string, unknown>;
    expect((org.seller as Record<string, unknown>)["@type"]).toBe("Organization");
  });

  it("leaves a field out rather than inventing it", () => {
    const bare = auctionSchema({ id: "b2", title: "Ceva" });
    expect(bare.image).toBeUndefined();
    expect(bare.itemCondition).toBeUndefined();
    expect((bare.offers as Record<string, unknown>).price).toBeUndefined();
    // and stays serialisable, which is all a crawler ever sees
    expect(() => JSON.stringify(bare)).not.toThrow();
  });

  it("maps our wear vocabulary onto schema.org's", () => {
    expect(auctionSchema({ ...listing, condition: "NEW" }).itemCondition).toBe(
      "https://schema.org/NewCondition",
    );
    expect(auctionSchema({ ...listing, condition: "GOOD" }).itemCondition).toBe(
      "https://schema.org/UsedCondition",
    );
  });
});

describe("causeSchema", () => {
  it("describes a cause as an organisation, not a product", () => {
    const schema = causeSchema({
      slug: "impreuna-pentru-ana",
      name: "Împreună pentru Ana",
      shortDescription: "Tratament în Viena.",
      city: "Cluj",
    });
    expect(schema["@type"]).toBe("NGO");
    expect(schema.url).toBe(`${SITE_URL}/cauze/impreuna-pentru-ana`);
    expect((schema.address as Record<string, unknown>).addressLocality).toBe("Cluj");
  });

  it("omits an address it was not given", () => {
    expect(causeSchema({ slug: "x", name: "X" }).address).toBeUndefined();
  });
});

describe("breadcrumbSchema", () => {
  it("numbers the trail from one and makes each step absolute", () => {
    const trail = breadcrumbSchema([
      { name: "Acasă", path: "/" },
      { name: "Licitații", path: "/licitatii" },
    ]);
    const items = trail.itemListElement as Record<string, unknown>[];
    expect(items.map((item) => item.position)).toEqual([1, 2]);
    expect(items[1].item).toBe(`${SITE_URL}/licitatii`);
  });
});

describe("site identity", () => {
  it("points the search action at the catalogue's own query", () => {
    const action = websiteSchema().potentialAction as Record<string, unknown>;
    const target = action.target as Record<string, unknown>;
    expect(target.urlTemplate).toContain("/licitatii?q={search_term_string}");
  });

  it("gives the organisation a stable id everything else can refer to", () => {
    expect(organizationSchema()["@id"]).toBe(`${SITE_URL}/#organization`);
    expect(
      (websiteSchema().publisher as Record<string, unknown>)["@id"],
    ).toBe(`${SITE_URL}/#organization`);
  });
});
