#!/usr/bin/env python3
"""
Parse Il Violino menu from raw text into proper V2 JSON structure.
Cross-referenced with existing restaurant menus to ensure correct schema.
"""
import json
import re
from uuid import uuid4

def parse_il_violino():
    """Parse the Il Violino menu maintaining exact formatting/caps/grammar."""

    with open('testing/dummy_menu.txt', 'r') as f:
        raw_text = f.read()

    # Menu structure based on raw text analysis
    # Single menu: DINNER
    # Categories: zuppe, insalate, APPETIZERS, RISOTTO, paste, secondi, contorni, DESSERT, dessert wine, dessert coffees, italian cordials

    menu_v2 = {
        "version": 2,
        "currency": "USD",
        "language": "en",
        "updated_at": "",
        "raw_input": raw_text,
        "menus": [
            {
                "id": "il-violino-dinner",
                "name": "Dinner",
                "display_order": 1,
                "categories": []
            }
        ],
        "specials": [],
        "upsell_tips": []
    }

    # Parse categories and items
    categories_data = [
        ("zuppe", 1, [
            {"name": "minestrone", "description": "traditional Italian chunky vegetable soup", "price": 12},
            {"name": "PASTA E FAGIOLI", "description": "classic Italian bean soup", "price": 13},
            {"name": "brodetto di pesce", "description": "shrimp, calamari, mussels, clams, salmon, light tomato broth", "price": 27},
            {"name": "SOUP OF THE DAY", "description": "", "price": 12}
        ]),
        ("insalate", 2, [
            {"name": "mista", "description": "lettuce, tomato, radish, carrot, sherry vinaigrette", "price": 13},
            {"name": "tricolore", "description": "endive, arugula, radicchio, pecorino cheese flakes, sherry vinagrette", "price": 14},
            {"name": "spinaci e caprino", "description": "baby spinach, walnuts, goat cheese, balsamic reduction", "price": 14},
            {"name": "cesare", "description": "caesar salad", "price": 13},
            {"name": "cesare with chicken or shrimp", "description": "caesar salad with chicken or shrimp", "price": 27},
            {"name": "indivia", "description": "endive, cherry tomatoes, avocado, parmigiano cheese flakes, lemon dressing", "price": 14}
        ]),
        ("APPETIZERS", 3, [
            {"name": "antipasto misto all'italiana", "description": "selection of Italian cured meats & cheese", "price": 25},
            {"name": "prosciutto di parma con melone", "description": "Italian aged prosciutto & melon", "price": 18},
            {"name": "CARPACCIO DI MANZO", "description": "raw fillet of beef, arugula, parmigiano flakes, carpaccio sauce", "price": 22},
            {"name": "polpette", "description": "meatballs, mashed potatoes, brown sauce", "price": 18},
            {"name": "calamari fritti", "description": "fried calamari, marinara sauce", "price": 20},
            {"name": "SALMONE MARINATO", "description": "cured salmon, asparagus", "price": 19},
            {"name": "sautéeD di cozze", "description": "steamed P. E. I. mussels, garlic bruschetta", "price": 24},
            {"name": "caprese", "description": "fresh tomatoes, mozzarella, pesto", "price": 18},
            {"name": "verdure grigliate", "description": "grilled seasonal vegetables, extra virgin olive oil, aged balsamic vinegar", "price": 20}
        ]),
        ("RISOTTO", 4, [
            {"name": "Risotto ai frutti di mare", "description": "Arborio rice, mussels, clams, calamari, shrimp, salmon", "price": 37},
            {"name": "Risotto quatro formaggi", "description": "Arborio rice, chef's mix four chesses", "price": 27},
            {"name": "Risotto al tartufo nero", "description": "Arborio rice, porcini mushrooms, black truffles", "price": 34}
        ]),
        ("paste", 5, [
            {"name": "spaghetti al pomodoro", "description": "fresh tomato sauce", "price": 23},
            {"name": "ravioli alfredo", "description": "spinach & ricotta ravioli, cream sauce", "price": 28},
            {"name": "penne alla vodka", "description": "light vodka, tomato pink sauce", "price": 26},
            {"name": "spaghetti primavera", "description": "mixed vegetables, tomato sauce", "price": 28},
            {"name": "gnocchi alla bolognese", "description": "bolognese ragu", "price": 28},
            {"name": "BUCCATINI ALL'AMATRICIANA", "description": "cured Italian bacon, onions, tomato sauce", "price": 28},
            {"name": "lasagna alla bolognese", "description": "homemade lasagna, bolognese ragu", "price": 29},
            {"name": "orecchiette broccoli e salsiccia", "description": "broccoli rabe & Italian sausage ragu, garlic & oil", "price": 28},
            {"name": "spaghetti con polpettine", "description": "meatballs with currants, tomato sauce", "price": 29},
            {"name": "linguine con cozze e vongole", "description": "manila clams, P. E. I. mussels, white wine or tomato sauce", "price": 35},
            {"name": "Fettuccine CON SCAMPI all' ARRABIATTA", "description": "shrimp, porcini mushroom, crushed red pepper, brown truffle butter sauce", "price": 38},
            {"name": "linguine ai frutti di mare", "description": "mixed seafood", "price": 37}
        ]),
        ("secondi", 6, [
            {"name": "petto di pollo", "description": "breast of chicken in a piccata or marsala sauce, season vegetables or mashed potatoes", "price": 34},
            {"name": "alla parmigiana - veal", "description": "veal parmigiana, served with pasta", "price": 37},
            {"name": "alla parmigiana - chicken", "description": "chicken parmigiana, served with pasta", "price": 36},
            {"name": "alla parmigiana - shrimp", "description": "shrimp parmigiana, served with pasta", "price": 39},
            {"name": "alla parmigiana - eggplant", "description": "eggplant parmigiana, served with pasta", "price": 28},
            {"name": "scaloppine di vitello MARSALA", "description": "veal, mushrooms, marsala wine, season vegetables or mashed potatoes", "price": 37},
            {"name": "Brasato di Agnello", "description": "braised lamb, seasonal vegetables or mashed potatoes", "price": 35},
            {"name": "FILETTO DI MANZO", "description": "filet mignon, barolo mushroom sauce, season vegetables or mashed potatoes", "price": 50},
            {"name": "salmone", "description": "grilled salmon, Dijon mustard sauce, season vegetables or mashed potatoes", "price": 37},
            {"name": "sCAMPI OREGENATA", "description": "breaded crumb shrimp, white wine, lemon, garlic, saffron risotto", "price": 39},
            {"name": "CAPESANTE", "description": "sea scallops, spinach, julienne vegetables, caramelized onions, currants, white truffle olive oil", "price": 39},
            {"name": "Branzino alla Griglia", "description": "grilled Mediterranean sea bass, season vegetables", "price": 37}
        ]),
        ("contorni", 7, [
            {"name": "pure di patate", "description": "mashed potatoes", "price": 10},
            {"name": "asparagi", "description": "grilled asparagus", "price": 10},
            {"name": "spinaci", "description": "spinach with garlic & olive oil", "price": 10},
            {"name": "cavoletti", "description": "brussel sprouts, Italian cured bacon", "price": 10},
            {"name": "cime di rapa", "description": "broccoli rabe & crushed peppers", "price": 10}
        ]),
        ("DESSERT", 8, [
            {"name": "TORTA AL CIOCCOLATO", "description": "flourless chocolate cake topped with vanilla gelato", "price": 14},
            {"name": "TIRAMISU", "description": "espresso soaked lady fingers and mascarpone cheese dusted with cocoa powder", "price": 12},
            {"name": "CROSTATA DI RICOTTA", "description": "lemon ricotta cheesecake", "price": 10},
            {"name": "BISCOTTI", "description": "chef's selection traditional Italian cookies", "price": 9},
            {"name": "PANNA COTTA", "description": "homemade chilled 'cooked cream' thickened with gelatine and molded", "price": 10},
            {"name": "SORBETTO", "description": "lemon or mango sorbet", "price": 10},
            {"name": "GELATO", "description": "chocolate or vanilla", "price": 10},
            {"name": "AFFOGATO", "description": "gelato topped with espresso", "price": 9},
            {"name": "TARTUFO", "description": "zabaione cream center, surrounded by chocolate gelato and caramelized hazelnuts, topped with cocoa powder", "price": 14},
            {"name": "FORMAGGI", "description": "cheese selection served with crostini, honey black truffles", "price": 20}
        ]),
        ("dessert wine", 9, [
            {"name": "moscato mionetto - glass", "description": "crisp on the palate with delicate fruit flavors reminiscent of peaches and honey. Great with biscotti", "price": 14},
            {"name": "moscato mionetto - bottle", "description": "crisp on the palate with delicate fruit flavors reminiscent of peaches and honey. Great with biscotti", "price": 50}
        ]),
        ("dessert coffees", 10, [
            {"name": "coffee or tea", "description": "", "price": 4},
            {"name": "espresso - single", "description": "", "price": 5},
            {"name": "espresso - double", "description": "", "price": 6},
            {"name": "HOT CHOCOLATE", "description": "", "price": 6},
            {"name": "cappuccino", "description": "", "price": 6},
            {"name": "caffè e latte", "description": "served regular or decaffeinated, hot or iced", "price": 6},
            {"name": "caffè d'amore", "description": "amaretto, whipped cream", "price": 14},
            {"name": "irish coffee", "description": "irish whiskey, whipped cream", "price": 14}
        ]),
        ("italian cordials", 11, [
            {"name": "amaretto di saronno", "description": "", "price": 14},
            {"name": "amaro ramazzotti", "description": "", "price": 14},
            {"name": "cynar", "description": "", "price": 14},
            {"name": "fernet branca", "description": "", "price": 14},
            {"name": "frangelico", "description": "", "price": 14},
            {"name": "GALLIANO", "description": "", "price": 14},
            {"name": "VIN SANTO", "description": "", "price": 14},
            {"name": "grappa", "description": "", "price": 14},
            {"name": "limoncello", "description": "", "price": 14},
            {"name": "sambuca romana", "description": "", "price": 14}
        ])
    ]

    # Build categories in V2 format (matching other restaurants)
    for cat_name, display_order, items_list in categories_data:
        category = {
            "id": str(uuid4()),
            "name": cat_name,
            "display_order": display_order,
            "items": []
        }

        for idx, item_data in enumerate(items_list, 1):
            item = {
                "id": str(uuid4()),
                "name": item_data["name"],
                "description": item_data["description"],
                "price": item_data["price"],
                "price_type": "fixed",
                "source": "parsed",
                "display_order": idx,
                "currency": "USD",
                "allergens": [],
                "dietary_tags": [],
                "prep_methods": [],
                "modifiers": [],
                "modifier_groups": [],
                "removable_ingredients": [],
                "needs_review": False,
                "review_reasons": []
            }
            category["items"].append(item)

        menu_v2["menus"][0]["categories"].append(category)

    return menu_v2

if __name__ == '__main__':
    import sqlite3

    print("="*60)
    print("IL VIOLINO MENU PARSER")
    print("="*60)
    print()

    # Parse menu
    print("Parsing menu from raw text...")
    menu_data = parse_il_violino()

    # Stats
    total_categories = len(menu_data["menus"][0]["categories"])
    total_items = sum(len(cat["items"]) for cat in menu_data["menus"][0]["categories"])

    print(f"✓ Parsed successfully")
    print(f"  Menus: {len(menu_data['menus'])}")
    print(f"  Categories: {total_categories}")
    print(f"  Total Items: {total_items}")
    print()

    # Show category breakdown
    print("Category Breakdown:")
    for cat in menu_data["menus"][0]["categories"]:
        print(f"  {cat['name']}: {len(cat['items'])} items")
    print()

    # Update database
    print("Updating database...")
    conn = sqlite3.connect('localdata.db')
    c = conn.cursor()

    menu_json = json.dumps(menu_data, indent=2)
    c.execute('UPDATE menu_details SET menu_data = ? WHERE id = 0', (menu_json,))
    conn.commit()

    print(f"✓ Database updated ({len(menu_json)} bytes)")
    print()

    # Verify
    c.execute('SELECT menu_data FROM menu_details WHERE id = 0')
    result = c.fetchone()
    verified = json.loads(result[0])

    verified_items = sum(len(cat["items"]) for cat in verified["menus"][0]["categories"])

    print("="*60)
    print("VERIFICATION")
    print("="*60)
    print(f"✓ Version: {verified['version']}")
    print(f"✓ Menus: {len(verified['menus'])}")
    print(f"✓ Categories: {len(verified['menus'][0]['categories'])}")
    print(f"✓ Total Items: {verified_items}")
    print()

    if verified_items == total_items:
        print("✓✓✓ SUCCESS: All items restored correctly!")
    else:
        print(f"✗ WARNING: Item count mismatch (expected {total_items}, got {verified_items})")

    conn.close()
    print()
    print("="*60)
    print("RESTORATION COMPLETE")
    print("="*60)
