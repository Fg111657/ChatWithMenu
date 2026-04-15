# V1 QA Report: Menu Parser Verification

**Date:** 2026-01-13
**Tested by:** Automated QA Script

---

## Executive Summary

Tested 3 restaurants with different menu formats:
- **Il Violino (Italian)**: PDF-style menu, 61 items, 3.3% need review
- **Tacombi (Mexican)**: Structured format (Item:/Ingr.:), 12 items, 100% need review (no prices in data)
- **Khantong Thai (Asian)**: Structured with prices, 92 items, 4.3% need review

**Overall Parser Quality:** Good for structured formats, needs improvement for PDF-style menus.

---

## Restaurant 1: Il Violino (Italian)

**Menu Format:** PDF-style with dish names on one line, descriptions on next line
**Total Items Parsed:** 61
**Categories Detected:** 16
**Needs Review:** 2 (3.3%)
**With Modifiers:** 2

### ✅ Passed Tests
- **Caesar salad modifier test**:
  - Base price: $13.00
  - Modifier "with chicken": +$14.00
  - Modifier "shrimp": +$14.00
- Category headers correctly detected (zuppe, insalate, etc.)
- Glass|bottle variants NOT parsed as items (correctly filtered)

### ⚠️ Issues Found
1. **Description lines parsed as items**: Lines like "lettuce, tomato, radish, carrot, sherry vinaigrette" are being parsed as dish names instead of descriptions
2. **Description attachment**: With descriptions = 0 (should attach to previous item)

### 📋 Sample Parsed Items
| Name | Price | Modifiers | Issues |
|------|-------|-----------|--------|
| traditional Italian chunky vegetable soup | $12.00 | - | Should be description of "minestrone" |
| caesar salad | $13.00 | +$14 chicken, +$14 shrimp | ✓ Correct |
| SOUP OF THE DAY | $12.00 | - | ✓ Correct |

---

## Restaurant 2: Tacombi (Mexican)

**Menu Format:** Structured with "Item:" and "Ingr.:" prefixes
**Total Items Parsed:** 12
**Needs Review:** 12 (100%)
**With Ingredients:** 12 (100%)

### ⚠️ Issues Found
1. **No prices in source data**: All items flagged for review with "Price is $0"
2. This appears to be an ingredient-only menu export, not a customer-facing menu

### ✅ Passed Tests
- Ingredient text correctly captured
- Item names correctly extracted

### 📋 Sample Parsed Items
| Name | Price | Ingredients |
|------|-------|-------------|
| Corn Esquites | $0 | Corn kernels (roasted), Mayonnaise... |
| Rice & Beans | $0 | White rice (steamed), Black beans... |
| Guacamole con Totopos | $0 | Avocado (mashed), Lime juice... |

---

## Restaurant 3: Khantong Thai Kitchen (Asian)

**Menu Format:** Structured with "Item:", "Price:", "Ingr.:" prefixes
**Total Items Parsed:** 92
**Categories Detected:** 9
**Needs Review:** 4 (4.3%)
**With Ingredients:** 91 (99%)

### ✅ Passed Tests
- Prices correctly extracted from "Price: $XX.XX" lines
- Ingredient text correctly captured
- Numbered items (V1., V2., etc.) correctly parsed
- Category headers detected (Chef Signatures, Vegetarian, etc.)

### ⚠️ Issues Found
1. **Market Price (MP)**: Items with "Price: MP" flagged as $0 - correct behavior, needs owner review

### 📋 Sample Parsed Items
| Name | Price | Ingredients | Review |
|------|-------|-------------|--------|
| Tamarind Duck | $26.00 | Duck breast (crispy-fried)... | - |
| Pla Rad Prik | $0.00 | Whole red snapper... | Price is $0 (MP) |
| V1. Miracle Tofu | $13.00 | Tofu (fried), Broccoli... | - |

---

## Parser Quality Metrics

| Metric | Il Violino | Tacombi | Khantong | Average |
|--------|------------|---------|----------|---------|
| Items Parsed | 61 | 12 | 92 | 55 |
| % Needs Review | 3.3% | 100% | 4.3% | 35.9% |
| % With Description | 0% | 100% | 99% | 66% |
| % With Modifiers | 3.3% | 0% | 0% | 1.1% |

---

## Recommendations

### High Priority
1. **Fix PDF-style description attachment**: When a line has no price and follows an item, attach as description
2. **Handle "MP" (Market Price)**: Flag as needs review but with specific reason "Market Price - needs manual entry"

### Medium Priority
3. **Improve category header detection**: Don't parse all-caps single words as items
4. **Add menu format auto-detection**: Detect if menu uses "Item:/Price:/Ingr.:" format

### Low Priority
5. **Handle multi-line descriptions**: Some descriptions span multiple lines

---

## Allergy Chat Readiness

| Restaurant | Ingredient Data | Allergy-Safe |
|------------|-----------------|--------------|
| Il Violino | ❌ Not captured | ⚠️ Manual entry needed |
| Tacombi | ✅ Captured | ✅ Ready |
| Khantong Thai | ✅ Captured | ✅ Ready |

**Conclusion:** Structured format menus (Tacombi, Khantong) have ingredient data for allergy chat. PDF-style menus (Il Violino) need manual entry or parser improvement.

---

## ServerDashboard Verification

Verified that ServerDashboard:
- ✅ Loads menu items from API
- ✅ Filters by allergens work
- ✅ Specials display with available_days filtering
- ✅ Upsell tips respect enabled flag

---

## Test Evidence

```
=== Caesar Salad Modifier Test ===
Input: "caesar salad 13 | with chicken or shrimp 27"
Output:
  Name: caesar salad
  Price: $13.00
  Modifiers:
    - with chicken: +$14.00
    - shrimp: +$14.00
Result: PASS
```

---

*Report generated by parser_qa_test.py*
