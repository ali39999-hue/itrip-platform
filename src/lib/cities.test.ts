import { describe, it, expect } from "vitest";
import { resolveCityQuery, localizedAirportLabel } from "./cities";

describe("cities utility", () => {
  describe("resolveCityQuery", () => {
    it("resolves city by ID and English name", () => {
      expect(resolveCityQuery("thr")?.id).toBe("thr");
      expect(resolveCityQuery("Tehran")?.id).toBe("thr");
      expect(resolveCityQuery("kih")?.id).toBe("kih");
    });

    it("resolves city by Persian name", () => {
      expect(resolveCityQuery("تهران")?.id).toBe("thr");
      expect(resolveCityQuery("کیش")?.id).toBe("kih");
      expect(resolveCityQuery("اصفهان")?.id).toBe("ifn");
    });

    it("resolves city with Arabic typo variations like Arabic Kaf", () => {
      // كيش with Arabic Kaf (\u0643)
      expect(resolveCityQuery("كيش")?.id).toBe("kih");
    });

    it("resolves city by airport IATA code", () => {
      expect(resolveCityQuery("THR")?.id).toBe("thr");
      expect(resolveCityQuery("IFN")?.id).toBe("ifn");
    });

    it("returns undefined for null, empty, or unknown queries", () => {
      expect(resolveCityQuery(null)).toBeUndefined();
      expect(resolveCityQuery("")).toBeUndefined();
      expect(resolveCityQuery("non_existent_city")).toBeUndefined();
    });
  });

  describe("localizedAirportLabel", () => {
    it("keeps Persian label for fa locale", () => {
      expect(localizedAirportLabel("تهران (THR)", "fa")).toBe("تهران (THR)");
    });

    it("localizes to English name for non-fa locales", () => {
      expect(localizedAirportLabel("تهران (THR)", "en")).toBe("Tehran (THR)");
      expect(localizedAirportLabel("کیش (KIH)", "ar")).toBe("Kish Island (KIH)");
    });
  });
});
