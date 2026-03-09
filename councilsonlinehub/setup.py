"""
One-time setup helpers for the CouncilsOnline Hub site.
Called by deploy_hub.sh and GitHub Actions after first install.
"""

import frappe


def configure_council_registry(councils=None):
    """
    Populates the council_registry child table in CouncilsOnline Settings.

    councils: list of dicts with keys: council_name, council_code, api_url, is_active

    Example:
        bench --site portal.councilsonline.com execute councilsonlinehub.setup.configure_council_registry \
            --kwargs '{"councils": [{"council_name": "Whangarei District Council", "council_code": "WDC", "api_url": "https://demo.councilsonline.com", "is_active": 1}]}'
    """
    if not councils:
        return

    settings = frappe.get_single("CouncilsOnline Settings")
    existing_codes = {e.council_code for e in (settings.council_registry or [])}

    added = []
    for c in councils:
        if c.get("council_code") in existing_codes:
            frappe.logger().info(f"Council {c['council_code']} already in registry — skipping")
            continue
        settings.append("council_registry", {
            "council_name": c["council_name"],
            "council_code": c["council_code"],
            "api_url": c["api_url"].rstrip("/"),
            "is_active": c.get("is_active", 1),
        })
        added.append(c["council_name"])

    if added:
        settings.save(ignore_permissions=True)
        frappe.db.commit()
        print(f"Added councils: {', '.join(added)}")
    else:
        print("No new councils to add")
