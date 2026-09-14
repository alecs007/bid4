import { describe, expect, it } from "vitest";

import { EMAIL_PATTERN, safeRedirect, withRedirect } from "./form";

describe("safeRedirect", () => {
  const lands = (value: string | null | undefined) =>
    new URL(safeRedirect(value), "https://bid4.ro").href;

  it("keeps a same-origin path, with its query and hash", () => {
    expect(safeRedirect("/cont/licitatiile-mele")).toBe("/cont/licitatiile-mele");
    expect(safeRedirect("/licitatii?category=moda")).toBe("/licitatii?category=moda");
    expect(safeRedirect("/cauze#lista")).toBe("/cauze#lista");
  });

  it("falls back when there is nothing to go back to", () => {
    expect(safeRedirect(null)).toBe("/");
    expect(safeRedirect(undefined)).toBe("/");
    expect(safeRedirect("")).toBe("/");
    expect(safeRedirect("", "/licitatii")).toBe("/licitatii");
  });

  it.each([
    ["a protocol-relative URL", "//evil.com"],
    ["an absolute URL", "https://evil.com/phish"],
    ["a backslash folded into a second slash", "/\\evil.com"],
    ["a backslash pair", "\\\\evil.com"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a data: URL", "data:text/html,<script>alert(1)</script>"],
    ["a credentialed host", "//user:pass@evil.com"],
  ])("refuses %s", (_label, value) => {
    expect(safeRedirect(value)).toBe("/");
    expect(lands(value)).toBe("https://bid4.ro/");
  });

  it("never returns something that resolves off-site", () => {
    const hostile = [
      "//evil.com",
      "/\\evil.com",
      "/\\\\evil.com",
      "https://evil.com",
      "http://evil.com",
      "//evil.com/path?a=b",
    ];
    for (const value of hostile) {
      expect(lands(value).startsWith("https://bid4.ro/")).toBe(true);
    }
  });
});

describe("withRedirect", () => {
  it("carries the current page into the sign-in link", () => {
    expect(withRedirect("/autentificare", "/cont/vanzari")).toBe(
      "/autentificare?redirect=%2Fcont%2Fvanzari",
    );
  });

  it("leaves the link alone when there is nowhere worth returning to", () => {
    expect(withRedirect("/autentificare", "/")).toBe("/autentificare");
    expect(withRedirect("/autentificare", null)).toBe("/autentificare");
  });

  it("does not append a second query string", () => {
    expect(withRedirect("/autentificare?x=1", "/cont")).toBe("/autentificare?x=1");
  });
});

describe("EMAIL_PATTERN", () => {
  it("accepts an ordinary address", () => {
    expect(EMAIL_PATTERN.test("maria@bid4.ro")).toBe(true);
    expect(EMAIL_PATTERN.test("maria.ionescu+licitatii@example.co.uk")).toBe(true);
  });

  it("rejects what is obviously not one", () => {
    for (const value of ["maria", "maria@", "@bid4.ro", "maria@bid4", "a b@c.ro"]) {
      expect(EMAIL_PATTERN.test(value)).toBe(false);
    }
  });
});
