import { describe, it, expect } from "vitest";
import {
  validateNationalId,
  validateShetabCard,
  getShetabBank,
  formatShetabCard,
  formatTomanHuman,
  normalizePersianText,
  toAsciiDigits,
  toPersianDigits,
} from "./iranian-commerce";

describe("iranian-commerce utilities", () => {
  describe("validateNationalId", () => {
    it("validates legitimate Iranian national IDs", () => {
      // Known valid national IDs with correct mod-11 checksums
      expect(validateNationalId("0010312013")).toBe(true);
      expect(validateNationalId("0084545933")).toBe(true);
      expect(validateNationalId("0499370899")).toBe(true);
    });

    it("accepts national IDs with Persian / Arabic-Indic digits", () => {
      expect(validateNationalId("۰۰۱۰۳۱۲۰۱۳")).toBe(true);
      expect(validateNationalId("٠٠١٠٣١٢٠١٣")).toBe(true);
    });

    it("rejects repetitive digit strings", () => {
      expect(validateNationalId("0000000000")).toBe(false);
      expect(validateNationalId("1111111111")).toBe(false);
      expect(validateNationalId("2222222222")).toBe(false);
      expect(validateNationalId("9999999999")).toBe(false);
    });

    it("rejects invalid lengths and invalid characters", () => {
      expect(validateNationalId("")).toBe(false);
      expect(validateNationalId("12345")).toBe(false);
      expect(validateNationalId("12345678901")).toBe(false);
      expect(validateNationalId("001031201A")).toBe(false);
    });

    it("rejects incorrect checksums", () => {
      expect(validateNationalId("0010312014")).toBe(false);
      expect(validateNationalId("1234567890")).toBe(false);
    });
  });

  describe("validateShetabCard & getShetabBank", () => {
    it("identifies bank from 6-digit BIN", () => {
      const melli = getShetabBank("603799");
      expect(melli?.slug).toBe("melli");
      expect(melli?.nameFa).toBe("بانک ملی ایران");

      const saman = getShetabBank("621986");
      expect(saman?.slug).toBe("saman");
      expect(saman?.nameFa).toBe("بانک سامان");

      const mellat = getShetabBank("610433");
      expect(mellat?.slug).toBe("mellat");
      expect(mellat?.nameFa).toBe("بانک ملت");

      const pasargad = getShetabBank("502229");
      expect(pasargad?.slug).toBe("pasargad");
      expect(pasargad?.nameFa).toBe("بانک پاسارگاد");
    });

    it("returns null for unknown BIN or short numbers", () => {
      expect(getShetabBank("111111")).toBeNull();
      expect(getShetabBank("1234")).toBeNull();
    });

    it("validates Shetab card using Luhn algorithm", () => {
      // 6037 9918 1234 5676 -> test card with valid Luhn
      // Luhn check for 6037991812345676:
      // (6*2-9)=3, 0, (3*2)=6, 7, (9*2-9)=9, 9, (1*2)=2, 8, (1*2)=2, 2, (3*2)=6, 4, (5*2-9)=1, 6, (7*2-9)=5, 6
      // sum = 3+0+6+7+9+9+2+8+2+2+6+4+1+6+5+6 = 76 -> not mod 10
      // Let's create a verified Luhn card for 603799:
      // 603799712345678X:
      // 6 -> 3
      // 0 -> 0
      // 3 -> 6
      // 7 -> 7
      // 9 -> 9
      // 9 -> 9
      // 7 -> 5
      // 1 -> 1
      // 2 -> 4
      // 3 -> 3
      // 4 -> 8
      // 5 -> 5
      // 6 -> 3
      // 7 -> 7
      // 8 -> 7
      // sum without last digit = 3+0+6+7+9+9+5+1+4+3+8+5+3+7+7 = 77
      // so last digit must make it 80 -> digit 3.
      // Card: 6037997123456783
      const card = "6037997123456783";
      const result = validateShetabCard(card);
      expect(result.isValid).toBe(true);
      expect(result.bank?.slug).toBe("melli");

      // Invalid card (bad checksum)
      const invalid = validateShetabCard("6037997123456784");
      expect(invalid.isValid).toBe(false);
      expect(invalid.bank).toBeNull();
    });

    it("handles Persian digits in card number", () => {
      const cardFa = "۶۰۳۷۹۹۷۱۲۳۴۵۶۷۸۳";
      const result = validateShetabCard(cardFa);
      expect(result.isValid).toBe(true);
      expect(result.bank?.slug).toBe("melli");
    });
  });

  describe("formatShetabCard", () => {
    it("formats 16-digit card number with dashes", () => {
      expect(formatShetabCard("6037997123456783")).toBe("6037-9971-2345-6783");
      expect(formatShetabCard("6037997123456783", " ")).toBe("6037 9971 2345 6783");
    });

    it("handles empty or partial inputs gracefully", () => {
      expect(formatShetabCard("")).toBe("");
      expect(formatShetabCard("603799")).toBe("6037-99");
    });
  });

  describe("formatTomanHuman", () => {
    it("formats billions correctly", () => {
      expect(formatTomanHuman(2_500_000_000)).toBe("۲.۵ میلیارد تومان");
      expect(formatTomanHuman(3_000_000_000)).toBe("۳ میلیارد تومان");
    });

    it("formats millions correctly", () => {
      expect(formatTomanHuman(65_000_000)).toBe("۶۵ میلیون تومان");
      expect(formatTomanHuman(1_500_000)).toBe("۱.۵ میلیون تومان");
    });

    it("formats thousands correctly", () => {
      expect(formatTomanHuman(250_000)).toBe("۲۵۰ هزار تومان");
    });

    it("formats small amounts and zero", () => {
      expect(formatTomanHuman(0)).toBe("۰ تومان");
      expect(formatTomanHuman(500)).toBe("۵۰۰ تومان");
    });

    it("handles bigint amounts", () => {
      expect(formatTomanHuman(BigInt(150_000_000))).toBe("۱۵۰ میلیون تومان");
    });
  });

  describe("normalizePersianText & digit helpers", () => {
    it("normalizes Arabic Yeh and Kaf to Persian", () => {
      expect(normalizePersianText("هتل اسپيناس")).toBe("هتل اسپیناس");
      expect(normalizePersianText("كتاب")).toBe("کتاب");
    });

    it("converts Arabic/Persian digits to ASCII and vice versa", () => {
      expect(toAsciiDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
      expect(toAsciiDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
      expect(toPersianDigits("0123456789")).toBe("۰۱۲۳۴۵۶۷۸۹");
    });

    it("strips Arabic diacritics", () => {
      expect(normalizePersianText("سَفَر")).toBe("سفر");
      expect(normalizePersianText("مُسَافِر")).toBe("مسافر");
    });
  });
});
