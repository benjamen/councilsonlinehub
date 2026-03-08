"""
CouncilsOnline Agent Hub API

Runs on the hub site (portal.councilsonline.co.nz, site_mode = "hub").
Provides:
  - Agent profile read/write (canonical store for address + specialties)
  - Cross-council request aggregation
  - Profile endpoint for council sites to pull on first login
"""

import frappe
from frappe import _


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _require_hub_mode():
    settings = frappe.get_single("CouncilsOnline Settings")
    if getattr(settings, "site_mode", "council") != "hub":
        frappe.throw(_("This endpoint is only available on the hub site"), frappe.PermissionError)


def _validate_service_token(token):
    settings = frappe.get_single("CouncilsOnline Settings")
    expected = getattr(settings, "hub_service_token", None)
    if not expected or token != expected:
        frappe.throw(_("Invalid service token"), frappe.AuthenticationError)


# ---------------------------------------------------------------------------
# Agent endpoints (authenticated as the agent themselves)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_hub_profile():
    """Agent fetches their own canonical profile from the hub."""
    _require_hub_mode()
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    if not frappe.db.exists("User Profile Extended", user):
        return {}

    profile = frappe.get_doc("User Profile Extended", user)
    result = {
        "phone": profile.phone,
        "company_name": profile.company_name,
        "business_type": profile.business_type,
        "company_number": profile.company_number,
        "trading_name": getattr(profile, "trading_name", None),
        "gst_number": getattr(profile, "gst_number", None),
        "business_phone": profile.business_phone,
        "physical_flat_unit": getattr(profile, "physical_flat_unit", None),
        "physical_rural_delivery": getattr(profile, "physical_rural_delivery", None),
        "physical_suburb": getattr(profile, "physical_suburb", None),
        "physical_city": getattr(profile, "physical_city", None),
        "physical_postcode": getattr(profile, "physical_postcode", None),
        "mailing_type": getattr(profile, "mailing_type", None),
        "mailing_po_box": getattr(profile, "mailing_po_box", None),
        "mailing_suburb": getattr(profile, "mailing_suburb", None),
        "mailing_city": getattr(profile, "mailing_city", None),
        "mailing_postcode": getattr(profile, "mailing_postcode", None),
        "specialties": [s.specialty_name for s in (profile.specialties or [])],
        "sq1_question": getattr(profile, "sq1_question", None),
    }
    # Directors + A.O. from linked Organization
    org_name = profile.company_name
    if org_name and frappe.db.exists("Organization", org_name):
        org = frappe.get_doc("Organization", org_name)
        result["directors"] = [
            {
                "first_name": d.get("first_name") or (d.get("director_name", "")).split(" ")[0],
                "last_name": d.get("last_name") or " ".join((d.get("director_name", "")).split(" ")[1:]),
                "email": d.get("email") or d.get("director_email", ""),
                "phone": d.get("phone") or d.get("director_phone", ""),
            }
            for d in (org.get("directors") or [])
        ]
        officers = org.get("officers") or []
        if officers:
            o = officers[0]
            result["authorising_officer"] = {
                "first_name": o.get("first_name") or (o.get("officer_name", "")).split(" ")[0],
                "last_name": o.get("last_name") or " ".join((o.get("officer_name", "")).split(" ")[1:]),
                "email": o.get("email") or o.get("officer_email", ""),
                "phone": o.get("phone") or o.get("officer_phone", ""),
            }
    return result


@frappe.whitelist()
def save_hub_profile(
    phone=None, company_name=None, gst_number=None, trading_name=None,
    business_phone=None, website=None,
    physical_flat_unit=None, physical_rural_delivery=None, physical_suburb=None,
    physical_city=None, physical_postcode=None,
    mailing_type=None, mailing_po_box=None, mailing_suburb=None,
    mailing_city=None, mailing_postcode=None,
    specialties=None, directors=None, authorising_officer=None,
):
    """Agent saves canonical profile on the hub."""
    _require_hub_mode()
    # Delegate to auth.save_registration_profile which handles all the logic
    from councilsonline.api.auth import save_registration_profile
    return save_registration_profile(
        phone=phone, company_name=company_name, gst_number=gst_number,
        trading_name=trading_name, business_phone=business_phone, website=website,
        physical_flat_unit=physical_flat_unit, physical_rural_delivery=physical_rural_delivery,
        physical_suburb=physical_suburb, physical_city=physical_city,
        physical_postcode=physical_postcode, mailing_type=mailing_type,
        mailing_po_box=mailing_po_box, mailing_suburb=mailing_suburb,
        mailing_city=mailing_city, mailing_postcode=mailing_postcode,
        specialties=specialties, directors=directors,
        authorising_officer=authorising_officer,
    )


# ---------------------------------------------------------------------------
# Council-facing endpoints (authenticated via service token)
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_agent_profile_for_council(agent_email=None, service_token=None):
    """
    Called by council sites on first agent login to fetch canonical profile.
    Returns address, specialties, directors, authorising_officer.
    """
    _require_hub_mode()
    _validate_service_token(service_token)

    if not agent_email:
        frappe.throw(_("agent_email is required"))

    if not frappe.db.exists("User Profile Extended", agent_email):
        return {}

    # Reuse get_hub_profile logic but impersonate the agent
    profile = frappe.get_doc("User Profile Extended", agent_email)
    result = {
        "physical_flat_unit": getattr(profile, "physical_flat_unit", None),
        "physical_rural_delivery": getattr(profile, "physical_rural_delivery", None),
        "physical_suburb": getattr(profile, "physical_suburb", None),
        "physical_city": getattr(profile, "physical_city", None),
        "physical_postcode": getattr(profile, "physical_postcode", None),
        "mailing_type": getattr(profile, "mailing_type", None),
        "mailing_po_box": getattr(profile, "mailing_po_box", None),
        "mailing_suburb": getattr(profile, "mailing_suburb", None),
        "mailing_city": getattr(profile, "mailing_city", None),
        "mailing_postcode": getattr(profile, "mailing_postcode", None),
        "specialties": [s.specialty_name for s in (profile.specialties or [])],
    }
    org_name = profile.company_name
    if org_name and frappe.db.exists("Organization", org_name):
        org = frappe.get_doc("Organization", org_name)
        result["directors"] = [
            {
                "first_name": d.get("first_name") or (d.get("director_name", "")).split(" ")[0],
                "last_name": d.get("last_name") or " ".join((d.get("director_name", "")).split(" ")[1:]),
                "email": d.get("email") or d.get("director_email", ""),
                "phone": d.get("phone") or d.get("director_phone", ""),
            }
            for d in (org.get("directors") or [])
        ]
        officers = org.get("officers") or []
        if officers:
            o = officers[0]
            result["authorising_officer"] = {
                "first_name": o.get("first_name") or (o.get("officer_name", "")).split(" ")[0],
                "last_name": o.get("last_name") or " ".join((o.get("officer_name", "")).split(" ")[1:]),
                "email": o.get("email") or o.get("officer_email", ""),
                "phone": o.get("phone") or o.get("officer_phone", ""),
            }
    return result


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------

@frappe.whitelist()
def aggregate_requests():
    """
    Hub aggregator: calls get_council_agent_requests on each active council
    in the council_registry and merges results.
    """
    _require_hub_mode()
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    settings = frappe.get_single("CouncilsOnline Settings")
    token = getattr(settings, "hub_service_token", None)
    registry = getattr(settings, "council_registry", []) or []

    import requests as req

    all_requests = []
    for entry in registry:
        if not entry.is_active:
            continue
        api_url = (entry.api_url or "").rstrip("/")
        if not api_url:
            continue
        try:
            resp = req.get(
                f"{api_url}/api/method/councilsonline.api.auth.get_council_agent_requests",
                params={"agent_email": user, "service_token": token},
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json().get("message") or []
                for item in data:
                    item["council_name"] = entry.council_name
                    item["council_url"] = api_url
                    all_requests.append(item)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"Hub aggregate error: {entry.council_name}")

    # Sort by submitted_date descending
    all_requests.sort(key=lambda x: x.get("submitted_date", ""), reverse=True)
    return all_requests


@frappe.whitelist()
def get_council_registry():
    """Returns the list of councils registered on the hub."""
    _require_hub_mode()
    settings = frappe.get_single("CouncilsOnline Settings")
    registry = getattr(settings, "council_registry", []) or []
    return [
        {
            "council_name": e.council_name,
            "council_code": e.council_code,
            "api_url": e.api_url,
            "is_active": e.is_active,
        }
        for e in registry if e.is_active
    ]


@frappe.whitelist()
def test_sync_nz_attributes(target_email, userinfo_json):
    """
    TEST ONLY: Simulate a Keycloak NZ SSO login for a given user.
    Calls sync_nz_attributes with the provided userinfo dict.
    Only callable by Administrator or System Manager.
    """
    if frappe.session.user not in ("Administrator",) and \
       not frappe.db.exists("Has Role", {"parent": frappe.session.user, "role": "System Manager"}):
        frappe.throw("Not authorized", frappe.PermissionError)

    import json
    userinfo = json.loads(userinfo_json) if isinstance(userinfo_json, str) else userinfo_json

    # Ensure the target user exists in Frappe
    if not frappe.db.exists("User", target_email):
        u = frappe.get_doc({
            "doctype": "User",
            "email": target_email,
            "first_name": userinfo.get("given_name", "Test"),
            "last_name": userinfo.get("family_name", "User"),
            "user_type": "Website User",
            "send_welcome_email": 0,
        })
        u.flags.ignore_permissions = True
        u.insert()
        frappe.db.commit()

    # Temporarily impersonate the target user for the sync
    original_user = frappe.session.user
    frappe.set_user(target_email)
    try:
        from councilsonlinehub.api.keycloak_nz import sync_nz_attributes
        sync_nz_attributes(target_email, userinfo)
        frappe.db.commit()
    finally:
        frappe.set_user(original_user)

    # Return the resulting profile
    if frappe.db.exists("User Profile Extended", target_email):
        profile = frappe.get_doc("User Profile Extended", target_email)
        return {
            "user_role": profile.user_role,
            "business_type": profile.business_type,
            "phone": profile.phone,
            "trading_name": getattr(profile, "trading_name", None),
            "sq1_question": profile.sq1_question,
            "physical_city": getattr(profile, "physical_city", None),
            "physical_postcode": getattr(profile, "physical_postcode", None),
            "specialties": [s.specialty_name for s in profile.specialties],
        }
    return {"error": "Profile not created"}

@frappe.whitelist()
def test_apply_hub_data(target_email, hub_data_json):
    """
    TEST ONLY: Directly apply hub profile data to a local user profile.
    Simulates what _sync_from_hub does when it receives data from the hub API.
    Used to test the hub-is-master overwrite behaviour on a single-site setup
    where hub and council share the same DB.
    Only callable by Administrator or System Manager.
    """
    if frappe.session.user not in ("Administrator",) and \
       not frappe.db.exists("Has Role", {"parent": frappe.session.user, "role": "System Manager"}):
        frappe.throw("Not authorized", frappe.PermissionError)

    import json
    data = json.loads(hub_data_json) if isinstance(hub_data_json, str) else hub_data_json

    if not frappe.db.exists("User Profile Extended", target_email):
        return {"error": "Profile not found"}

    profile_doc = frappe.get_doc("User Profile Extended", target_email)

    for field in ("physical_flat_unit", "physical_rural_delivery", "physical_suburb",
                  "physical_city", "physical_postcode", "mailing_type",
                  "mailing_po_box", "mailing_suburb", "mailing_city", "mailing_postcode"):
        if data.get(field) is not None:
            profile_doc.set(field, data[field])

    if data.get("specialties"):
        profile_doc.specialties = []
        for s in data["specialties"]:
            profile_doc.append("specialties", {"specialty_name": s})

    profile_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "physical_city": getattr(profile_doc, "physical_city", None),
        "physical_postcode": getattr(profile_doc, "physical_postcode", None),
        "physical_suburb": getattr(profile_doc, "physical_suburb", None),
        "specialties": [s.specialty_name for s in profile_doc.specialties],
    }
