/**
 * Tests for the taxonomy primitives. These are pure functions, so
 * they're the most important (and cheapest) piece of the test
 * pyramid — they pin down the semantic classification that the card
 * pills + drawer depend on.
 */
import {
  cleanTagLabel,
  classifyTagSemantic,
  classForGroup,
  groupForTag,
  canonicalizeTag,
  ALL_TAGS,
  GROUP_ORDER,
  GROUP_CLASS,
  TAG_GROUPS,
} from "../taxonomy";

describe("cleanTagLabel", () => {
  it("passes through a normal display label", () => {
    expect(cleanTagLabel("Gluten-Free")).toBe("Gluten-Free");
    expect(cleanTagLabel("Vegan")).toBe("Vegan");
    expect(cleanTagLabel("Contains Dairy")).toBe("Contains Dairy");
  });

  it("strips the trailing Recommended suffix", () => {
    expect(cleanTagLabel("Nut-Free Recommended")).toBe("Nut-Free");
    expect(cleanTagLabel("Egg-Free Recommended")).toBe("Egg-Free");
    expect(cleanTagLabel("Dairy-Free  Recommended  ")).toBe("Dairy-Free");
  });

  it("drops raw import slugs from upstream", () => {
    // lowercase-hyphen is the upstream slug shape we never want to render
    expect(cleanTagLabel("facebook-allergy-community-import")).toBeNull();
    expect(cleanTagLabel("reported-peanut")).toBeNull();
    expect(cleanTagLabel("community-status-recommended")).toBeNull();
    expect(cleanTagLabel("venue-type-amusement-park")).toBeNull();
  });

  it("returns null for empty / non-string input", () => {
    expect(cleanTagLabel("")).toBeNull();
    expect(cleanTagLabel("   ")).toBeNull();
    expect(cleanTagLabel(null)).toBeNull();
    expect(cleanTagLabel(undefined)).toBeNull();
    expect(cleanTagLabel(42)).toBeNull();
  });
});

describe("classifyTagSemantic", () => {
  it("classifies Contains-* as red", () => {
    expect(classifyTagSemantic("Contains Gluten")).toBe("red");
    expect(classifyTagSemantic("Contains Dairy")).toBe("red");
    expect(classifyTagSemantic("Contains Tree Nuts")).toBe("red");
  });

  it("classifies May Contain-* as amber", () => {
    expect(classifyTagSemantic("May Contain Nuts")).toBe("amber");
    expect(classifyTagSemantic("May Contain Gluten")).toBe("amber");
    // loose spacing
    expect(classifyTagSemantic("MayContain Soy")).toBe("amber");
  });

  it("classifies -Free / Vegan / Halal / Kosher as green", () => {
    expect(classifyTagSemantic("Gluten-Free")).toBe("green");
    expect(classifyTagSemantic("Nut-Free")).toBe("green");
    expect(classifyTagSemantic("Vegan")).toBe("green");
    expect(classifyTagSemantic("Vegetarian")).toBe("green");
    expect(classifyTagSemantic("Halal")).toBe("green");
    expect(classifyTagSemantic("Kosher")).toBe("green");
  });

  it("defaults ambiguous / dietary labels to green", () => {
    expect(classifyTagSemantic("Mediterranean")).toBe("green");
    expect(classifyTagSemantic("Heart-Healthy")).toBe("green");
    expect(classifyTagSemantic("Small Portions")).toBe("green");
  });

  it("handles non-string input without throwing", () => {
    expect(classifyTagSemantic(null)).toBe("green");
    expect(classifyTagSemantic(undefined)).toBe("green");
  });
});

describe("classForGroup / groupForTag", () => {
  it("returns the right CSS class for every group", () => {
    expect(classForGroup("Religious")).toBe("cwm-grp-0");
    expect(classForGroup("Diet")).toBe("cwm-grp-1");
    expect(classForGroup("Allergies")).toBe("cwm-grp-2");
    expect(classForGroup("Therapeutic")).toBe("cwm-grp-3");
    expect(classForGroup("Lifestyle")).toBe("cwm-grp-4");
    expect(classForGroup("Ethical")).toBe("cwm-grp-5");
    expect(classForGroup("Life Stage")).toBe("cwm-grp-6");
    expect(classForGroup("GLP-1 / Portions")).toBe("cwm-grp-7");
    expect(classForGroup("Sensory / Neurodivergent")).toBe("cwm-grp-8");
  });

  it("returns empty string for unknown groups", () => {
    expect(classForGroup("NotAGroup")).toBe("");
    expect(classForGroup(null)).toBe("");
  });

  it("resolves tag → group correctly", () => {
    expect(groupForTag("Gluten-Free")).toBe("Allergies");
    expect(groupForTag("Vegan")).toBe("Diet");
    expect(groupForTag("Kosher")).toBe("Religious");
    expect(groupForTag("FODMAP")).toBe("Therapeutic");
    expect(groupForTag("Ozempic-Friendly")).toBe("GLP-1 / Portions");
    expect(groupForTag("ARFID-Friendly")).toBe("Sensory / Neurodivergent");
  });

  it("handles loose casing / hyphenation in tag lookup", () => {
    expect(groupForTag("gluten-free")).toBe("Allergies");
    expect(groupForTag("GLUTEN FREE")).toBe("Allergies");
    expect(canonicalizeTag("gluten free")).toBe("Gluten-Free");
  });
});

describe("taxonomy invariants", () => {
  it("has 104 unique tags across 9 groups", () => {
    expect(GROUP_ORDER).toHaveLength(9);
    // 6 + 17 + 20 + 23 + 10 + 8 + 8 + 6 + 6 = 104 tags total
    expect(ALL_TAGS).toHaveLength(104);
    expect(new Set(ALL_TAGS).size).toBe(104); // no dupes
  });

  it("every group has a CSS class", () => {
    GROUP_ORDER.forEach((g) => {
      expect(GROUP_CLASS[g]).toMatch(/^cwm-grp-\d$/);
    });
  });

  it("every tag is placed in exactly one group", () => {
    const counts = {};
    Object.values(TAG_GROUPS).forEach((tags) => {
      tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
    });
    Object.entries(counts).forEach(([tag, n]) => {
      expect({ tag, n }).toMatchObject({ n: 1 });
    });
  });
});
