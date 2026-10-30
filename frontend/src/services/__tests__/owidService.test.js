import { describe, it, expect, vi, afterEach } from "vitest";
import { parseCsv } from "../owidService";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("historical source integrity and recovery", () => {
  it("preserves true zero but excludes missing values", () => {
    const rows = parseCsv(
      "Entity,Code,Year,Annual CO₂ emissions\nIndia,IND,2024,\nIndia,IND,2023,0\nIndia,IND,,10",
      "emissions",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ year: 2023, value: 0 });
  });
  it("rejects changed source schemas", () => {
    expect(() =>
      parseCsv("Entity,Year,Changed\nIndia,2024,1", "emissions"),
    ).toThrow("missing required columns");
  });
  it("shares concurrent requests and serves cached records", async () => {
    const fetcher = vi.fn(async (url) => ({
      ok: true,
      text: async () =>
        url.includes("per-capita")
          ? "Entity,Code,Year,CO₂ emissions per capita\nIndia,IND,2024,2"
          : "Entity,Code,Year,Annual CO₂ emissions\nIndia,IND,2024,2000000",
    }));
    vi.stubGlobal("fetch", fetcher);
    const { getOwidData } = await import("../owidService");
    const [a, b] = await Promise.all([getOwidData(), getOwidData()]);
    expect(a).toBe(b);
    expect(a[0].perCapitaTonnes).toBe(2);
    await getOwidData();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it("retries after an upstream error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 })),
    );
    const { getOwidData } = await import("../owidService");
    await expect(getOwidData()).rejects.toThrow("503");
    await expect(getOwidData()).rejects.toThrow("503");
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
