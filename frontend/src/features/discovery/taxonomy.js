/**
 * Dietary / lifestyle taxonomy — 97 tags across 9 color-coded groups.
 *
 * This is the single source of truth. Everywhere else — pills on cards,
 * filter drawer, color stamping — looks tags up here. When we add a new
 * tag we add it ONCE here and the whole UI picks it up.
 *
 * The rule on display: a tag is shown on a card only when the agent
 * pipeline (Reddit discovery, menu scrape, owner input) has surfaced
 * evidence for it. Nothing is inferred. An empty restaurant renders no
 * pills — better to show nothing than guess.
 */

export const TAG_GROUPS = {
  Religious: [
    "Halal", "Kosher", "Lenten", "Jain", "Buddhist", "Sattvic",
  ],
  Diet: [
    "Vegan", "Vegetarian", "Pescatarian", "Flexitarian", "Mediterranean",
    "DASH", "Carnivore", "Keto", "Paleo", "AIP", "WFPB", "Raw Vegan",
    "Raw Food", "Whole30", "Low-Carb", "Zero-Carb", "OMAD",
  ],
  Allergies: [
    "Gluten-Free", "Wheat-Free", "Dairy-Free", "Lactose-Free", "Nut-Free",
    "Peanut-Free", "Tree-Nut-Free", "Egg-Free", "Soy-Free", "Corn-Free",
    "Fish-Free", "Shellfish-Free", "Mollusc-Free", "Sesame-Free",
    "Mustard-Free", "Celery-Free", "Lupin-Free", "Sulfite-Free",
    "Cross-Contamination-Safe", "Dedicated Facility",
  ],
  Therapeutic: [
    "FODMAP", "Low-Histamine", "Low-Oxalate", "Low-Sodium", "Low-Glycemic",
    "Low-Cholesterol", "Low-Residue", "Low-Tyramine", "Low-Purine",
    "Nightshade-Free", "GERD-Friendly", "IBS-Friendly", "Crohn's-Friendly",
    "Gastroparesis-Friendly", "Renal-Friendly", "Liver-Friendly",
    "Heart-Healthy", "Diabetic-Friendly", "Anti-Inflammatory",
    "PCOS-Friendly", "Thyroid-Friendly", "Cancer-Nutrition", "Migraine-Safe",
  ],
  Lifestyle: [
    "High-Protein", "Sugar-Free", "Alcohol-Free", "No-MSG",
    "No-Preservatives", "No-Artificial-Dyes", "Non-GMO", "Seed-Oil-Free",
    "Whole-Food", "Organic",
  ],
  Ethical: [
    "Grass-Fed", "Wild-Caught", "Pasture-Raised", "Locally Sourced",
    "Regenerative", "Humane-Certified", "Fair-Trade", "Zero-Waste",
  ],
  "Life Stage": [
    "Pregnancy-Safe", "Breastfeeding-Safe", "Bariatric-Friendly",
    "Toddler-Friendly", "Senior-Friendly", "Fertility-Friendly",
    "Postpartum", "Post-Op",
  ],
  "GLP-1 / Portions": [
    "Ozempic-Friendly", "Protein-Forward", "Small Portions", "Half Portions",
    "Low-Calorie", "Calorie-Dense",
  ],
  "Sensory / Neurodivergent": [
    "ARFID-Friendly", "Texture-Sensitive", "Dye-Free", "Salicylate-Free",
    "ADHD-Friendly", "Autism-Sensory",
  ],
};

/**
 * Per-group color palette. Each group is a unique "brand-safe" family that
 * reads distinctly in both light backgrounds (inactive pills) and solid
 * fills (active pills). Format: { bg, fg, border, active, dot }.
 *
 *   bg     = pill background when inactive (soft tint)
 *   fg     = pill text color when inactive
 *   border = pill border when inactive
 *   active = pill solid fill + text-white when selected
 *   dot    = small color dot prefixed to the pill label
 */
export const GROUP_PALETTE = {
  Religious:               { bg: "#EEF0FF", fg: "#3730A3", border: "#C7CAF0", active: "#4F46E5", dot: "#4F46E5" },
  Diet:                    { bg: "#E6FBEF", fg: "#0F7A3A", border: "#A6E8C2", active: "#16803C", dot: "#16803C" },
  Allergies:               { bg: "#FFE9E9", fg: "#9F1818", border: "#F4B6B6", active: "#B91C1C", dot: "#B91C1C" },
  Therapeutic:             { bg: "#E0F7F5", fg: "#0F766E", border: "#9CDDD6", active: "#0D9488", dot: "#0D9488" },
  Lifestyle:               { bg: "#E5F3FF", fg: "#0F5FB8", border: "#9FCBF2", active: "#0F7FE8", dot: "#0F7FE8" },
  Ethical:                 { bg: "#F0F4E0", fg: "#4D6B0E", border: "#CCDB94", active: "#65891A", dot: "#65891A" },
  "Life Stage":            { bg: "#FFE9F1", fg: "#9D174D", border: "#F4B6CF", active: "#DB2777", dot: "#DB2777" },
  "GLP-1 / Portions":      { bg: "#FFF3D6", fg: "#8A4A00", border: "#F2D08A", active: "#B45309", dot: "#B45309" },
  "Sensory / Neurodivergent": { bg: "#F1E8FE", fg: "#5B21B6", border: "#CFBAF0", active: "#7C3AED", dot: "#7C3AED" },
};

/**
 * Some tags might show up on the backend in slightly different casing or
 * hyphenation (e.g. "gluten-free" vs "Gluten-Free"). Canonicalizing lets
 * us match them anyway.
 */
const _norm = (s) => String(s || "").toLowerCase().replace(/[\s_\-']/g, "");

const _tagToGroup = {};
const _canonical = {};
Object.entries(TAG_GROUPS).forEach(([group, tags]) => {
  tags.forEach((tag) => {
    _tagToGroup[tag] = group;
    _canonical[_norm(tag)] = tag;
  });
});

/** Return the canonical (display) form of a tag, or the input if unknown. */
export const canonicalizeTag = (tag) => _canonical[_norm(tag)] || tag;

/** Return the group name a tag belongs to, or null if unknown. */
export const groupForTag = (tag) => _tagToGroup[canonicalizeTag(tag)] || null;

/** Return the palette entry for a tag; falls back to neutral gray. */
export const paletteForTag = (tag) => {
  const g = groupForTag(tag);
  return g
    ? GROUP_PALETTE[g]
    : { bg: "#F3F4F6", fg: "#374151", border: "#E5E7EB", active: "#6B7280", dot: "#9CA3AF" };
};

/** All tag names in a flat array (97 total). */
export const ALL_TAGS = Object.values(TAG_GROUPS).flat();

/** Ordered list of group names (fixes tab ordering in the drawer). */
export const GROUP_ORDER = Object.keys(TAG_GROUPS);

/**
 * CSS class per group. The discovery module's stylesheet defines
 * `.cwm-grp-0` through `.cwm-grp-8` with the palette baked in so
 * components don't have to inline colors — stylesheets own the look.
 */
export const GROUP_CLASS = {
  Religious:                 "cwm-grp-0",
  Diet:                      "cwm-grp-1",
  Allergies:                 "cwm-grp-2",
  Therapeutic:               "cwm-grp-3",
  Lifestyle:                 "cwm-grp-4",
  Ethical:                   "cwm-grp-5",
  "Life Stage":              "cwm-grp-6",
  "GLP-1 / Portions":        "cwm-grp-7",
  "Sensory / Neurodivergent":"cwm-grp-8",
};

/** Return the .cwm-grp-N class for a group, or empty string if unknown. */
export const classForGroup = (group) => GROUP_CLASS[group] || "";

/**
 * Strip upstream raw-import labels and the trailing "Recommended"
 * suffix. Upstream sometimes sends the tag as its internal slug
 * ("facebook-allergy-community-import", "reported-peanut",
 * "venue-type-amusement-park") — we never want to render those.
 *
 * Returns the cleaned label, or `null` if the label should be dropped.
 */
export function cleanTagLabel(label) {
  if (typeof label !== "string") return null;
  const s = label.trim();
  if (!s) return null;
  // Lowercase-hyphen slugs from the import pipeline — drop on the floor
  if (/^[a-z][a-z0-9\-_]{3,}$/.test(s)) return null;
  // Redundant "Recommended" suffix — the colored pill is the signal
  return s.replace(/\s*Recommended$/i, "").trim() || null;
}

/**
 * Prefix-classify a cleaned tag into one of three card-side semantic
 * buckets: "red" (contains allergen, warning), "amber" (may contain,
 * caution), or "green" (free-from / safe-for / friendly-for). This is
 * separate from the group palette used by the drawer — on the card,
 * the pill color is about safety, not taxonomy.
 */
export function classifyTagSemantic(label) {
  if (typeof label !== "string") return "green";
  if (/^contains\s/i.test(label)) return "red";
  if (/^may\s?contain/i.test(label)) return "amber";
  // Everything else in our taxonomy is a "friendly for" signal → green
  return "green";
}
