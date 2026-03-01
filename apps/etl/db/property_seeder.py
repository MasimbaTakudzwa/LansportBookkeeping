"""
Property Seeder for Lansport Analytics ETL
==========================================
Seeds the `properties` table with the 17 rental units and their
corresponding account numbers (revenue, R&M, levies).

Account mappings verified against: Bookkeeping Lansport Main (1).xlsx

Revenue accounts : 4010 – 4026
R&M accounts     : 5300 – 5316
Levy accounts    : 5400 – 5416
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Property definitions
# Each entry: name, group, display_order, revenue_acct, rm_acct, levy_acct
# ─────────────────────────────────────────────────────────────────────────────

PROPERTIES = [
    # Main Complex — Units 16, 17, 18, 19, 25-32
    {"name": "Unit 16",             "group": "Main Complex",  "order":  1, "rev": "4010", "rm": "5300", "levy": "5400"},
    {"name": "Unit 17",             "group": "Main Complex",  "order":  2, "rev": "4011", "rm": "5301", "levy": "5401"},
    {"name": "Unit 18",             "group": "Main Complex",  "order":  3, "rev": "4012", "rm": "5302", "levy": "5402"},
    {"name": "Unit 19",             "group": "Main Complex",  "order":  4, "rev": "4013", "rm": "5303", "levy": "5403"},
    {"name": "Unit 25",             "group": "Main Complex",  "order":  5, "rev": "4014", "rm": "5304", "levy": "5404"},
    {"name": "Unit 26",             "group": "Main Complex",  "order":  6, "rev": "4015", "rm": "5305", "levy": "5405"},
    {"name": "Unit 27",             "group": "Main Complex",  "order":  7, "rev": "4016", "rm": "5306", "levy": "5406"},
    {"name": "Unit 28",             "group": "Main Complex",  "order":  8, "rev": "4017", "rm": "5307", "levy": "5407"},
    {"name": "Unit 29",             "group": "Main Complex",  "order":  9, "rev": "4018", "rm": "5308", "levy": "5408"},
    {"name": "Unit 30",             "group": "Main Complex",  "order": 10, "rev": "4019", "rm": "5309", "levy": "5409"},
    {"name": "Unit 31",             "group": "Main Complex",  "order": 11, "rev": "4020", "rm": "5310", "levy": "5410"},
    {"name": "Unit 32",             "group": "Main Complex",  "order": 12, "rev": "4021", "rm": "5311", "levy": "5411"},
    # Mn Block
    {"name": "Unit Mn8",            "group": "Mn Block",      "order": 13, "rev": "4022", "rm": "5312", "levy": "5412"},
    {"name": "Unit Mn9",            "group": "Mn Block",      "order": 14, "rev": "4023", "rm": "5313", "levy": "5413"},
    # Standalone properties
    {"name": "Mainway",             "group": "Standalone",    "order": 15, "rev": "4024", "rm": "5314", "levy": "5414"},
    {"name": "Glaudina House",      "group": "Standalone",    "order": 16, "rev": "4025", "rm": "5315", "levy": "5415"},
    {"name": "Glaudina Cottage",    "group": "Standalone",    "order": 17, "rev": "4026", "rm": "5316", "levy": "5416"},
]


def seed_properties(session: Session) -> int:
    """Upsert all 17 rental unit properties. Returns the number of rows inserted/updated."""

    # Build account_number → id lookup
    result = session.execute(text("SELECT account_number, id FROM accounts"))
    account_map: dict[str, int] = {row[0]: row[1] for row in result.fetchall()}

    if not account_map:
        logger.warning("No accounts found — cannot seed properties yet")
        return 0

    inserted = 0
    for prop in PROPERTIES:
        rev_id  = account_map.get(prop["rev"])
        rm_id   = account_map.get(prop["rm"])
        levy_id = account_map.get(prop["levy"])

        if rev_id is None:
            logger.warning(f"Revenue account {prop['rev']} not found — skipping {prop['name']}")
            continue

        session.execute(
            text("""
                INSERT INTO properties
                    (name, "group", display_order, revenue_account_id, rm_account_id, levy_account_id)
                VALUES
                    (:name, :group, :order, :rev_id, :rm_id, :levy_id)
                ON CONFLICT (name) DO UPDATE SET
                    "group"            = EXCLUDED."group",
                    display_order      = EXCLUDED.display_order,
                    revenue_account_id = EXCLUDED.revenue_account_id,
                    rm_account_id      = EXCLUDED.rm_account_id,
                    levy_account_id    = EXCLUDED.levy_account_id
            """),
            {
                "name":    prop["name"],
                "group":   prop["group"],
                "order":   prop["order"],
                "rev_id":  rev_id,
                "rm_id":   rm_id,
                "levy_id": levy_id,
            },
        )
        inserted += 1

    logger.info(f"Properties seeded: {inserted} / {len(PROPERTIES)}")
    return inserted
