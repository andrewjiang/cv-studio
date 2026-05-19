import { describe, expect, it } from "vitest";
import { parseContactItems } from "@/app/_lib/resume-contact";

describe("resume-contact", () => {
  it("classifies plain phone numbers as phone contacts", () => {
    expect(parseContactItems(["+1 555 123 4567"])).toEqual([
      {
        href: "tel:+15551234567",
        kind: "phone",
        label: "+1 555 123 4567",
        platform: "phone",
      },
    ]);
  });

  it("classifies tel links as phone contacts", () => {
    expect(parseContactItems(["[+1 555 123 4567](tel:+15551234567)"])).toEqual([
      {
        href: "tel:+15551234567",
        kind: "phone",
        label: "+1 555 123 4567",
        platform: "phone",
      },
    ]);
  });
});
