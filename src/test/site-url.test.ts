import { describe, expect, it } from "vitest";
import { isLocalHost, resolvePublicAppOrigin } from "@/lib/site-url";

describe("public app origin", () => {
  it("does not put localhost in confirmation emails on Vercel", () => {
    expect(
      resolvePublicAppOrigin({
        requestOrigin: "https://oyametiase-uokw.vercel.app",
        envUrl: "http://localhost:3000",
      }),
    ).toBe("https://oyametiase-uokw.vercel.app");

    expect(
      resolvePublicAppOrigin({
        requestOrigin: "http://localhost:3000",
        envUrl: "http://localhost:3000",
        vercelProductionUrl: "oyametiase-uokw.vercel.app",
      }),
    ).toBe("https://oyametiase-uokw.vercel.app");
  });

  it("keeps localhost for local development", () => {
    expect(
      resolvePublicAppOrigin({
        requestOrigin: "http://localhost:3000",
        envUrl: "http://localhost:3000",
      }),
    ).toBe("http://localhost:3000");
  });

  it("recognizes loopback hosts", () => {
    expect(isLocalHost("http://localhost:3000")).toBe(true);
    expect(isLocalHost("https://oyametiase-uokw.vercel.app")).toBe(false);
  });
});
