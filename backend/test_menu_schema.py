"""
Unit tests for menu_schema.py

Tests V1→V2 conversion, validation, and normalization.

Run with:
    python -m pytest test_menu_schema.py -v

Or without pytest:
    python test_menu_schema.py
"""
import json
import sys
import menu_schema


def test_is_v2_detects_v2_format():
    """Test that is_v2() correctly identifies V2 format"""
    v2_data = {
        "version": 2,
        "menus": [
            {
                "id": "menu-1",
                "name": "Dinner",
                "display_order": 1,
                "categories": []
            }
        ]
    }
    assert menu_schema.is_v2(v2_data) == True
    print("✅ test_is_v2_detects_v2_format")


def test_is_v2_rejects_v1_format():
    """Test that is_v2() correctly rejects V1 format"""
    v1_data = {
        "sections": [
            {"name": "Appetizers", "items": []}
        ]
    }
    assert menu_schema.is_v2(v1_data) == False
    print("✅ test_is_v2_rejects_v1_format")


def test_v1_to_v2_converts_sections_to_categories():
    """Test that V1 sections are converted to V2 menus[0].categories"""
    v1_data = {
        "sections": [
            {
                "name": "Appetizers",
                "items": [
                    {"name": "Spring Rolls", "price": 8.50}
                ]
            },
            {
                "name": "Entrees",
                "items": [
                    {"name": "Pad Thai", "price": 15.00}
                ]
            }
        ],
        "raw_input": "DINNER MENU\n\nAppetizers\nSpring Rolls - $8.50\n\nEntrees\nPad Thai - $15.00"
    }

    v2_data = menu_schema.v1_to_v2(v1_data)

    assert v2_data["version"] == 2
    assert "sections" not in v2_data
    assert len(v2_data["menus"]) == 1
    assert len(v2_data["menus"][0]["categories"]) == 2
    assert v2_data["menus"][0]["categories"][0]["name"] == "Appetizers"
    assert v2_data["menus"][0]["categories"][1]["name"] == "Entrees"
    assert len(v2_data["menus"][0]["categories"][0]["items"]) == 1
    assert v2_data["menus"][0]["categories"][0]["items"][0]["name"] == "Spring Rolls"
    print("✅ test_v1_to_v2_converts_sections_to_categories")


def test_v1_to_v2_normalizes_items():
    """Test that V1→V2 conversion normalizes item fields"""
    v1_data = {
        "sections": [
            {
                "name": "Desserts",
                "items": [
                    {"name": "Tiramisu", "price": 9.00}  # Missing many optional fields
                ]
            }
        ],
        "raw_input": ""
    }

    v2_data = menu_schema.v1_to_v2(v1_data)
    item = v2_data["menus"][0]["categories"][0]["items"][0]

    # Check that all required V2 fields exist
    assert "id" in item
    assert item["name"] == "Tiramisu"
    assert item["price"] == 9.00
    assert item["price_type"] == "FIXED"
    assert item["source"] == "parsed"
    assert "allergens" in item
    assert "prep_methods" in item
    assert "modifier_groups" in item
    assert "removable_ingredients" in item
    print("✅ test_v1_to_v2_normalizes_items")


def test_validation_rejects_v1_format():
    """Test that validation rejects V1 format with sections"""
    v1_data = {
        "version": 1,
        "sections": [
            {"name": "Appetizers", "items": []}
        ]
    }

    errors = menu_schema.validate_menu_data_v2(v1_data)

    assert len(errors) > 0
    # Should reject because version != 2 and missing 'menus' key
    assert any("version" in error.lower() or "menus" in error.lower() for error in errors)
    print("✅ test_validation_rejects_v1_format")


def test_validation_enforces_price_type_fixed():
    """Test that FIXED price_type requires numeric price"""
    v2_data = {
        "version": 2,
        "menus": [
            {
                "id": "menu-1",
                "name": "Dinner",
                "display_order": 1,
                "categories": [
                    {
                        "id": "cat-1",
                        "name": "Entrees",
                        "display_order": 1,
                        "items": [
                            {
                                "id": "item-1",
                                "name": "Burger",
                                "price_type": "FIXED",
                                "price": None  # Invalid: FIXED requires numeric price
                            }
                        ]
                    }
                ]
            }
        ]
    }

    errors = menu_schema.validate_menu_data_v2(v2_data)

    assert len(errors) > 0
    assert any("price_type='FIXED' requires a numeric price" in error for error in errors)
    print("✅ test_validation_enforces_price_type_fixed")


def test_validation_enforces_price_type_mp():
    """Test that MP price_type requires price=null"""
    v2_data = {
        "version": 2,
        "menus": [
            {
                "id": "menu-1",
                "name": "Dinner",
                "display_order": 1,
                "categories": [
                    {
                        "id": "cat-1",
                        "name": "Seafood",
                        "display_order": 1,
                        "items": [
                            {
                                "id": "item-1",
                                "name": "Lobster",
                                "price_type": "MP",
                                "price": 45.00  # Invalid: MP requires null price
                            }
                        ]
                    }
                ]
            }
        ]
    }

    errors = menu_schema.validate_menu_data_v2(v2_data)

    assert len(errors) > 0
    assert any("price_type='MP' requires price=null" in error for error in errors)
    print("✅ test_validation_enforces_price_type_mp")


def test_validation_rejects_negative_price():
    """Test that negative prices are rejected"""
    v2_data = {
        "version": 2,
        "menus": [
            {
                "id": "menu-1",
                "name": "Dinner",
                "display_order": 1,
                "categories": [
                    {
                        "id": "cat-1",
                        "name": "Entrees",
                        "display_order": 1,
                        "items": [
                            {
                                "id": "item-1",
                                "name": "Burger",
                                "price_type": "FIXED",
                                "price": -5.00  # Invalid: negative price
                            }
                        ]
                    }
                ]
            }
        ]
    }

    errors = menu_schema.validate_menu_data_v2(v2_data)

    assert len(errors) > 0
    assert any("cannot be negative" in error for error in errors)
    print("✅ test_validation_rejects_negative_price")


def test_validation_accepts_valid_v2():
    """Test that valid V2 data passes validation"""
    v2_data = {
        "version": 2,
        "currency": "USD",
        "language": "en",
        "updated_at": "2026-01-14T12:00:00Z",
        "raw_input": "",
        "menus": [
            {
                "id": "menu-1",
                "name": "Dinner",
                "display_order": 1,
                "categories": [
                    {
                        "id": "cat-1",
                        "name": "Entrees",
                        "display_order": 1,
                        "items": [
                            {
                                "id": "item-1",
                                "name": "Burger",
                                "price_type": "FIXED",
                                "price": 15.00,
                                "description": "Delicious burger",
                                "allergens": [],
                                "prep_methods": ["Grilled"]
                            },
                            {
                                "id": "item-2",
                                "name": "Lobster",
                                "price_type": "MP",
                                "price": None,
                                "description": "Fresh lobster",
                                "allergens": ["shellfish"]
                            }
                        ]
                    }
                ]
            }
        ],
        "specials": [],
        "upsell_tips": []
    }

    errors = menu_schema.validate_menu_data_v2(v2_data)

    assert len(errors) == 0
    print("✅ test_validation_accepts_valid_v2")


def test_normalize_v2_adds_missing_fields():
    """Test that normalize_v2 adds missing optional fields"""
    minimal_v2 = {
        "version": 2,
        "menus": [
            {
                "id": "menu-1",
                "name": "Dinner",
                "categories": [
                    {
                        "id": "cat-1",
                        "name": "Entrees",
                        "items": [
                            {
                                "id": "item-1",
                                "name": "Burger",
                                "price": 15.00
                            }
                        ]
                    }
                ]
            }
        ]
    }

    normalized = menu_schema.normalize_v2(minimal_v2)

    # Check top-level fields
    assert normalized["currency"] == "USD"
    assert normalized["language"] == "en"
    assert "specials" in normalized
    assert "upsell_tips" in normalized

    # Check item has all fields
    item = normalized["menus"][0]["categories"][0]["items"][0]
    assert "price_type" in item
    assert "source" in item
    assert "allergens" in item
    assert "prep_methods" in item
    assert "modifier_groups" in item
    assert "removable_ingredients" in item
    print("✅ test_normalize_v2_adds_missing_fields")


def test_prepare_menu_data_for_response_handles_v1():
    """Test that prepare_menu_data_for_response converts V1→V2"""
    v1_json = json.dumps({
        "sections": [
            {"name": "Appetizers", "items": [{"name": "Wings", "price": 10.00}]}
        ],
        "raw_input": "LUNCH MENU"
    })

    result = menu_schema.prepare_menu_data_for_response(v1_json)

    assert result["version"] == 2
    assert "sections" not in result
    assert len(result["menus"]) == 1
    assert result["menus"][0]["name"] == "Lunch"  # Detected from raw_input
    assert len(result["menus"][0]["categories"]) == 1
    print("✅ test_prepare_menu_data_for_response_handles_v1")


def test_prepare_menu_data_for_response_handles_invalid_json():
    """Test that prepare_menu_data_for_response handles invalid JSON gracefully"""
    invalid_json = "{ this is not valid json }"

    result = menu_schema.prepare_menu_data_for_response(invalid_json)

    # Should return empty V2 structure
    assert result["version"] == 2
    assert result["menus"] == []
    print("✅ test_prepare_menu_data_for_response_handles_invalid_json")


# Test runner (if not using pytest)
def run_all_tests():
    """Run all tests without pytest"""
    print("=" * 70)
    print("Running menu_schema tests")
    print("=" * 70)
    print()

    tests = [
        test_is_v2_detects_v2_format,
        test_is_v2_rejects_v1_format,
        test_v1_to_v2_converts_sections_to_categories,
        test_v1_to_v2_normalizes_items,
        test_validation_rejects_v1_format,
        test_validation_enforces_price_type_fixed,
        test_validation_enforces_price_type_mp,
        test_validation_rejects_negative_price,
        test_validation_accepts_valid_v2,
        test_normalize_v2_adds_missing_fields,
        test_prepare_menu_data_for_response_handles_v1,
        test_prepare_menu_data_for_response_handles_invalid_json,
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            test_func()
            passed += 1
        except AssertionError as e:
            print(f"❌ {test_func.__name__} FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"❌ {test_func.__name__} ERROR: {e}")
            failed += 1

    print()
    print("=" * 70)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 70)

    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
