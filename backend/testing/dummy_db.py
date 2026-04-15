"""Use this to set up the DB with some dummy data."""
import os

import jonlog
import db_models

logger = jonlog.getLogger()


def fill_db(db):
    logger.info("Filling db with dummy data.")
    with open(os.path.dirname(os.path.abspath(__file__)) + '/dummy_menu.txt') as f:
        menu_txt = f.read()
    menu_txt = '\n'.join([x for x in menu_txt.splitlines() if x.strip()])
    with open(os.path.dirname(os.path.abspath(__file__)) + '/Il_Violino_Menu_Ingredients.csv') as f:
        menu_ing_txt = f.read()
    menu_ing_txt = '\n'.join([x for x in menu_ing_txt.splitlines() if x.strip()])
    
    db.merge(db_models.Restaurant(
        id=0,
        name='Il Violino',
    ))
    db.merge(db_models.MenuDetail(
        id=0,
        restaurant_id=0,
        menu_data=menu_txt,
    ))
    db.merge(db_models.RestaurantDocument(
        id=0,
        restaurant_id=0,
        document_type="Recipe",
        document_data=menu_ing_txt,
    ))

    jong = db_models.User(
        id=0,
        account_type=1,
        name='Jonathan Grant',
        email='me.ai',
    )
    jong.set_password('123')
    db.merge(jong)

    db.commit()
    logger.info('Added restaurant, menu, user, and restrictions.')
