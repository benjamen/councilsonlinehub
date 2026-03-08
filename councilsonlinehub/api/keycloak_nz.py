"""
CouncilsOnline — Keycloak NZ attribute sync.

Called after a user logs in via the NZ Keycloak realm.  Reads the custom
attributes that were captured during Keycloak registration and writes them
into Frappe's User Profile Extended and, for Company/Organisation users,
the Organization DocType.

Keycloak custom attributes used:
  userType        — "Agent" or "Applicant"
  agentType       — "Company" | "Sole Trader"  (agents only)
  applicantType   — "Company" | "Organisation" | "Individual"  (applicants only)
  phone, businessPhone, tradingName, companyName, companyNumber
  gstNumber, nzbn
  securityQuestion1..3, securityAnswer1..3
"""

import frappe
from frappe import _


def sync_nz_attributes(user_email, userinfo):
    """
    Called directly from sso.login_via_keycloak after the user is logged in.
    Syncs NZ-specific Keycloak attributes to User Profile Extended.
    Only runs when the azp claim matches the NZ client.
    """
    if not user_email or user_email in ("", "Guest", "Administrator"):
        return

    # Only run for the NZ realm client
    client_id = (userinfo or {}).get("azp") or ""
    if "nz" not in client_id.lower():
        return

    try:
        _sync_profile(user_email, userinfo)
        _sync_from_hub(user_email, userinfo)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Keycloak NZ sync error")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _sync_profile(user_email, attrs):
    """Write Keycloak attributes to User Profile Extended (upsert)."""
    profile = _get_or_create_profile(user_email, attrs)

    # --- Personal / contact ------------------------------------------------
    if attrs.get("phone") and not profile.phone:
        profile.phone = attrs["phone"]

    # --- Business details: determine entity type ---------------------------
    user_type = (attrs.get("userType") or "").strip()

    if user_type == "Agent":
        _sync_agent_business(profile, attrs)
    elif user_type == "Applicant":
        _sync_applicant_business(profile, attrs)

    # --- Business phone, GST, NZBN (shared across entity types) -----------
    if attrs.get("businessPhone"):
        profile.business_phone = attrs["businessPhone"]
    if attrs.get("gstNumber"):
        profile.gst_number = attrs["gstNumber"]
    if attrs.get("nzbn"):
        profile.nzbn = attrs["nzbn"]

    # --- Security questions -------------------------------------------------
    for i in range(1, 4):
        q_key = f"securityQuestion{i}"
        a_key = f"securityAnswer{i}"
        if attrs.get(q_key):
            profile.set(f"sq{i}_question", attrs[q_key])
        if attrs.get(a_key):
            profile.set(f"sq{i}_answer", attrs[a_key])

    profile.save(ignore_permissions=True)

    # --- Create Organization record (first login only) ---------------------
    _maybe_ensure_organization(user_email, attrs, user_type)


def _sync_agent_business(profile, attrs):
    """Handle agent-specific business type attributes."""
    agent_type = attrs.get("agentType", "Sole Trader")
    if agent_type == "Company":
        profile.business_type = "Limited Company"
        if attrs.get("companyName"):
            profile.company_name = attrs["companyName"]
        if attrs.get("companyNumber"):
            profile.company_number = attrs["companyNumber"]
    else:
        profile.business_type = "Sole Trader"
        if attrs.get("tradingName"):
            profile.trading_name = attrs["tradingName"]


def _sync_applicant_business(profile, attrs):
    """Handle applicant-specific business type attributes."""
    applicant_type = attrs.get("applicantType", "Individual")
    if applicant_type == "Company":
        profile.business_type = "Limited Company"
        if attrs.get("companyName"):
            profile.company_name = attrs["companyName"]
        if attrs.get("companyNumber"):
            profile.company_number = attrs["companyNumber"]
    elif applicant_type == "Organisation":
        profile.business_type = "Organisation"
        if attrs.get("companyName") or attrs.get("organisationName"):
            profile.company_name = attrs.get("companyName") or attrs.get("organisationName")
        if attrs.get("companyNumber") or attrs.get("organisationNumber"):
            profile.company_number = attrs.get("companyNumber") or attrs.get("organisationNumber")
    # Individual applicants: no business fields to sync


def _maybe_ensure_organization(user_email, attrs, user_type):
    """Create Organization record for company/org users on first login."""
    if user_type == "Agent":
        agent_type = attrs.get("agentType", "Sole Trader")
        if agent_type == "Company" and attrs.get("companyName"):
            _ensure_organization(user_email, attrs, "Agent")
    elif user_type == "Applicant":
        applicant_type = attrs.get("applicantType", "Individual")
        org_name = attrs.get("companyName") or attrs.get("organisationName")
        if applicant_type in ("Company", "Organisation") and org_name:
            org_type = "Agent" if applicant_type == "Company" else "Organisation"
            _ensure_organization(user_email, attrs, org_type)


def _get_or_create_profile(user_email, attrs):
    if frappe.db.exists("User Profile Extended", user_email):
        return frappe.get_doc("User Profile Extended", user_email)

    first_name = attrs.get("given_name") or attrs.get("firstName") or ""
    last_name = attrs.get("family_name") or attrs.get("lastName") or ""
    user_type = (attrs.get("userType") or "").strip()
    # Map Keycloak userType to Frappe user_role
    user_role = "Agent" if user_type == "Agent" else "Individual"

    full_name = f"{first_name} {last_name}".strip() or user_email
    profile = frappe.get_doc({
        "doctype": "User Profile Extended",
        "user": user_email,
        "full_name": full_name,
        "user_role": user_role,
        "first_name": first_name,
        "last_name": last_name,
    })
    profile.flags.ignore_permissions = True
    profile.insert()
    return profile


def _ensure_organization(user_email, attrs, org_type="Agent"):
    company_name = (attrs.get("companyName") or attrs.get("organisationName") or "").strip()
    if not company_name:
        return
    if frappe.db.exists("Organization", company_name):
        return
    try:
        org = frappe.get_doc({
            "doctype": "Organization",
            "organization_name": company_name,
            "organization_type": org_type,
            "email": user_email,
            "phone": attrs.get("businessPhone") or attrs.get("phone") or "",
            "business_number": attrs.get("companyNumber") or attrs.get("organisationNumber") or "",
        })
        org.flags.ignore_permissions = True
        org.insert()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Keycloak NZ org creation error")


def _sync_from_hub(user_email, attrs):
    """
    On every login to a council site, fetch the canonical profile from the
    Agent Hub (portal.councilsonline.co.nz) and overwrite local fields that
    are not stored in Keycloak (physical address, specialties, directors, A.O.)

    Hub is the master — hub data always overwrites council-local data.

    Only runs if:
    - CouncilsOnline Settings has hub_api_url configured
    - User Profile Extended exists for this user
    """
    try:
        settings = frappe.get_single("CouncilsOnline Settings")
        hub_url = getattr(settings, "hub_api_url", None)
        hub_token = getattr(settings, "hub_service_token", None)
        if not hub_url or not hub_token:
            return

        profile = frappe.db.exists("User Profile Extended", user_email)
        if not profile:
            return

        profile_doc = frappe.get_doc("User Profile Extended", user_email)

        import requests as req
        response = req.get(
            f"{hub_url.rstrip('/')}/api/method/councilsonline.api.hub.get_agent_profile_for_council",
            params={"agent_email": user_email, "service_token": hub_token},
            timeout=5,
        )
        if response.status_code != 200:
            return

        data = response.json().get("message") or {}
        if not data:
            return

        # Populate address fields
        for field in ("physical_flat_unit", "physical_rural_delivery", "physical_suburb",
                      "physical_city", "physical_postcode", "mailing_type",
                      "mailing_po_box", "mailing_suburb", "mailing_city", "mailing_postcode"):
            if data.get(field):
                profile_doc.set(field, data[field])

        # Populate specialties (child table)
        if data.get("specialties"):
            profile_doc.specialties = []
            for s in data["specialties"]:
                profile_doc.append("specialties", {"specialty_name": s})

        profile_doc.save(ignore_permissions=True)

        # Populate directors into Organization Director records
        if data.get("directors"):
            _sync_directors_from_hub(user_email, data["directors"])

        # Populate authorising officer into Organization Officer record
        if data.get("authorising_officer"):
            _sync_authorising_officer_from_hub(user_email, data["authorising_officer"])

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Hub profile sync error")


def _sync_directors_from_hub(user_email, directors):
    """Create Organization Director records from hub data."""
    org_name = frappe.db.get_value("User Profile Extended", user_email, "company_name")
    if not org_name:
        return
    for d in directors:
        if not d.get("email"):
            continue
        if not frappe.db.exists("Organization Director", {"parent": org_name, "email": d["email"]}):
            try:
                org = frappe.get_doc("Organization", org_name)
                org.append("directors", {
                    "first_name": d.get("first_name", ""),
                    "last_name": d.get("last_name", ""),
                    "email": d.get("email", ""),
                    "phone": d.get("phone", ""),
                })
                org.save(ignore_permissions=True)
            except Exception:
                frappe.log_error(frappe.get_traceback(), "Hub director sync error")


def _sync_authorising_officer_from_hub(user_email, ao):
    """Create Organization Officer record from hub data."""
    org_name = frappe.db.get_value("User Profile Extended", user_email, "company_name")
    if not org_name or not ao.get("email"):
        return
    try:
        org = frappe.get_doc("Organization", org_name)
        # Only add if not already present
        existing = [o.email for o in (org.get("officers") or [])]
        if ao["email"] not in existing:
            org.append("officers", {
                "first_name": ao.get("first_name", ""),
                "last_name": ao.get("last_name", ""),
                "email": ao.get("email", ""),
                "phone": ao.get("phone", ""),
            })
            org.save(ignore_permissions=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Hub A.O. sync error")
