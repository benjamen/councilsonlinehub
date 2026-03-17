"""
CouncilsOnline Agent Hub API

Runs on the hub site (portal.councilsonline.co.nz).
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

def _validate_service_token(token):
    from frappe.utils.password import get_decrypted_password
    expected = get_decrypted_password("CouncilsOnline Settings", "CouncilsOnline Settings", "hub_service_token")
    if not expected or token != expected:
        frappe.throw(_("Invalid service token"), frappe.AuthenticationError)


# ---------------------------------------------------------------------------
# Agent endpoints (authenticated as the agent themselves)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_hub_profile():
    """Agent fetches their own canonical profile from the hub."""
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
        "user_role": getattr(profile, "user_role", None),
        "first_name": getattr(profile, "first_name", None),
        "last_name": getattr(profile, "last_name", None),
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
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    settings = frappe.get_single("CouncilsOnline Settings")
    from frappe.utils.password import get_decrypted_password
    token = get_decrypted_password("CouncilsOnline Settings", "CouncilsOnline Settings", "hub_service_token")
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
def get_agent_quote_requests():
    """
    Hub aggregator: fetches pending quote requests for the logged-in agent
    across all active councils in the registry.
    """
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    settings = frappe.get_single("CouncilsOnline Settings")
    from frappe.utils.password import get_decrypted_password
    token = get_decrypted_password("CouncilsOnline Settings", "CouncilsOnline Settings", "hub_service_token")
    registry = getattr(settings, "council_registry", []) or []

    import requests as req

    all_quotes = []
    for entry in registry:
        if not entry.is_active:
            continue
        api_url = (entry.api_url or "").rstrip("/")
        if not api_url:
            continue
        try:
            resp = req.get(
                f"{api_url}/api/method/councilsonline.api.agents.get_agent_quote_requests_for_hub",
                params={"agent_email": user, "service_token": token},
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json().get("message") or []
                for item in data:
                    item["council_name"] = entry.council_name
                    item["council_url"] = api_url
                    all_quotes.append(item)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"Hub quote aggregate error: {entry.council_name}")

    all_quotes.sort(key=lambda x: x.get("invited_at", ""), reverse=True)
    return all_quotes


@frappe.whitelist()
def get_agent_quote_history():
    """
    Hub aggregator: fetches ALL quote history for the logged-in agent across all
    active councils (all statuses: Invited, Drafting, Quoted, Accepted, Declined, Withdrawn).
    Used by the My Quotes history page (NZ-541).
    """
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    settings = frappe.get_single("CouncilsOnline Settings")
    from frappe.utils.password import get_decrypted_password
    token = get_decrypted_password("CouncilsOnline Settings", "CouncilsOnline Settings", "hub_service_token")
    registry = getattr(settings, "council_registry", []) or []

    import requests as req

    all_quotes = []
    for entry in registry:
        if not entry.is_active:
            continue
        api_url = (entry.api_url or "").rstrip("/")
        if not api_url:
            continue
        try:
            resp = req.get(
                f"{api_url}/api/method/councilsonline.api.agents.get_agent_quote_requests_for_hub",
                params={"agent_email": user, "service_token": token, "include_history": 1},
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json().get("message") or []
                for item in data:
                    item["council_name"] = entry.council_name
                    item["council_url"] = api_url
                    all_quotes.append(item)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"Hub quote history aggregate error: {entry.council_name}")

    all_quotes.sort(key=lambda x: x.get("invited_at", ""), reverse=True)
    return all_quotes


@frappe.whitelist()
def invite_agent_to_quote(agent_profile=None, request_name=None, council_url=None):
    """
    Hub endpoint: applicant invites an agent to quote on one of their applications.
    Calls the council site to create the Agent Quote record.
    """
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    if not all([agent_profile, request_name, council_url]):
        frappe.throw(_("agent_profile, request_name, and council_url are required"))

    settings = frappe.get_single("CouncilsOnline Settings")
    from frappe.utils.password import get_decrypted_password
    token = get_decrypted_password("CouncilsOnline Settings", "CouncilsOnline Settings", "hub_service_token")

    import requests as req
    api_url = council_url.rstrip("/")
    try:
        resp = req.post(
            f"{api_url}/api/method/councilsonline.api.agents.invite_agent_from_hub",
            json={
                "request_name": request_name,
                "agent_email": agent_profile,
                "requester_email": user,
                "service_token": token,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json().get("message") or {"status": "ok"}
        else:
            frappe.throw(_("Failed to send invite to council: ") + str(resp.status_code))
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Hub invite_agent_to_quote error")
        frappe.throw(_("Could not reach council site"))


@frappe.whitelist()
def get_council_registry():
    """Returns the list of councils registered on the hub."""
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


@frappe.whitelist()
def provision_on_council(council_code=None):
    """
    Hub: push current agent's canonical profile to a council site and return a one-time auto-login URL.
    """
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    # Query DB directly — bypasses the Single doctype document cache which
    # caches child-table rows and doesn't always invalidate on child updates.
    entry = frappe.db.get_value(
        "Council Registry Entry",
        {"council_code": council_code, "is_active": 1, "parenttype": "CouncilsOnline Settings"},
        ["name", "council_code", "council_name", "api_url"],
        as_dict=True,
    )
    if not entry:
        frappe.throw(_("Council not found in registry"))

    api_url = (entry.api_url or "").rstrip("/")
    from frappe.utils.password import get_decrypted_password
    token = get_decrypted_password("CouncilsOnline Settings", "CouncilsOnline Settings", "hub_service_token") or ""

    # Build full profile directly (avoid self-calling the service endpoint which requires a token)
    profile_data = {}
    # Include the hub's own URL so council sites can link back for profile editing
    profile_data["hub_url"] = frappe.utils.get_url().rstrip("/")
    if frappe.db.exists("User", user):
        u = frappe.get_doc("User", user)
        profile_data["first_name"] = u.first_name
        profile_data["last_name"] = u.last_name
        profile_data["phone"] = u.phone or ""
        # Derive user_role from User's roles as a baseline (overridden by UPE value below)
        u_roles = [r.role for r in (u.roles or [])]
        profile_data["user_role"] = "Agent" if "Agent" in u_roles else "Individual"
    if frappe.db.exists("User Profile Extended", user):
        frappe.flags.ignore_permissions = True
        try:
            p = frappe.get_doc("User Profile Extended", user)
        finally:
            frappe.flags.ignore_permissions = False
        profile_data["phone"] = p.phone or profile_data.get("phone", "")
        profile_data["company_name"] = p.company_name
        _valid_biz_types = {"", "Sole Trader", "Limited Company", "Partnership", "Other"}
        profile_data["business_type"] = p.business_type if p.business_type in _valid_biz_types else ""
        # UPE user_role is authoritative — override the User-role-derived value
        profile_data["user_role"] = p.user_role or profile_data.get("user_role", "Individual")
        profile_data["physical_flat_unit"] = getattr(p, "physical_flat_unit", None)
        profile_data["physical_rural_delivery"] = getattr(p, "physical_rural_delivery", None)
        profile_data["physical_suburb"] = getattr(p, "physical_suburb", None)
        profile_data["physical_city"] = getattr(p, "physical_city", None)
        profile_data["physical_postcode"] = getattr(p, "physical_postcode", None)
        profile_data["mailing_type"] = getattr(p, "mailing_type", None)
        profile_data["mailing_po_box"] = getattr(p, "mailing_po_box", None)
        profile_data["mailing_suburb"] = getattr(p, "mailing_suburb", None)
        profile_data["mailing_city"] = getattr(p, "mailing_city", None)
        profile_data["mailing_postcode"] = getattr(p, "mailing_postcode", None)
        profile_data["specialties"] = [s.specialty_name for s in (p.specialties or [])]
        org_name = p.company_name
        if org_name and frappe.db.exists("Organization", org_name):
            org = frappe.get_doc("Organization", org_name)
            profile_data["directors"] = [
                {
                    "first_name": d.get("first_name") or "",
                    "last_name": d.get("last_name") or "",
                    "email": d.get("email") or "",
                    "phone": d.get("phone") or "",
                }
                for d in (org.get("directors") or [])
            ]
            officers = org.get("officers") or []
            if officers:
                o = officers[0]
                profile_data["authorising_officer"] = {
                    "first_name": o.get("first_name") or "",
                    "last_name": o.get("last_name") or "",
                    "email": o.get("email") or "",
                    "phone": o.get("phone") or "",
                }

    import requests as req
    try:
        resp = req.post(
            f"{api_url}/api/method/councilsonline.api.auth.provision_agent_from_hub",
            json={"agent_email": user, "profile_data": profile_data, "service_token": token},
            timeout=15,
        )
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Hub provision error: {entry.council_name}")
        frappe.throw(_("Could not reach council site: ") + str(e))

    if resp.status_code != 200:
        frappe.throw(_(f"Council site returned error {resp.status_code}"))

    data = resp.json().get("message") or {}
    auto_login_path = data.get("auto_login_path") or "/frontend/"

    # Record membership so the hub knows this user is registered on this council
    membership_name = f"{user}-{council_code}"
    if frappe.db.exists("Hub Council Membership", membership_name):
        frappe.db.set_value("Hub Council Membership", membership_name, "is_active", 1)
    else:
        frappe.get_doc({
            "doctype": "Hub Council Membership",
            "name": membership_name,
            "user": user,
            "council_code": council_code,
            "council_name": entry.council_name,
            "provisioned_at": frappe.utils.now(),
            "is_active": 1,
        }).insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "success": True,
        "auto_login_url": api_url + auto_login_path,
    }


@frappe.whitelist()
def provision_ao_to_council(ao_token, council_code):
    """
    Hub: complete AO registration after Keycloak sign-up.
    Validates the invitation token on the council, then provisions the AO
    (is_officer=1) to that council and returns a one-time auto-login URL.
    """
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    entry = frappe.db.get_value(
        "Council Registry Entry",
        {"council_code": council_code, "is_active": 1, "parenttype": "CouncilsOnline Settings"},
        ["name", "council_code", "council_name", "api_url"],
        as_dict=True,
    )
    if not entry:
        frappe.throw(_("Council not found in registry"))

    api_url = (entry.api_url or "").rstrip("/")
    from frappe.utils.password import get_decrypted_password
    service_token = get_decrypted_password("CouncilsOnline Settings", "CouncilsOnline Settings", "hub_service_token") or ""

    import requests as req

    # Step 1: validate the officer invitation token on the council
    try:
        validate_resp = req.post(
            f"{api_url}/api/method/councilsonline.api.officer.validate_officer_token_for_hub",
            json={"token": ao_token, "service_token": service_token},
            timeout=15,
        )
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "AO token validation error")
        frappe.throw(_("Could not reach council site: ") + str(e))

    if validate_resp.status_code != 200:
        frappe.throw(_("Council returned error {0} validating AO token").format(validate_resp.status_code))

    inv_data = validate_resp.json().get("message") or {}
    officer_name = inv_data.get("officer_name") or ""
    officer_email = inv_data.get("officer_email") or user
    organization = inv_data.get("organization") or ""

    # Step 2: build AO profile_data and provision to council
    hub_url = frappe.utils.get_url().rstrip("/")
    parts = officer_name.strip().split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""

    profile_data = {
        "hub_url": hub_url,
        "first_name": first_name,
        "last_name": last_name,
        "phone": "",
        "user_role": "Authorising Officer",
        "is_officer": 1,
        "organization": organization,
    }

    try:
        provision_resp = req.post(
            f"{api_url}/api/method/councilsonline.api.auth.provision_agent_from_hub",
            json={"agent_email": officer_email, "profile_data": profile_data, "service_token": service_token},
            timeout=15,
        )
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "AO provision error")
        frappe.throw(_("Could not provision AO to council: ") + str(e))

    if provision_resp.status_code != 200:
        frappe.throw(_("Council returned error {0} provisioning AO").format(provision_resp.status_code))

    data = provision_resp.json().get("message") or {}
    auto_login_path = data.get("auto_login_path") or "/frontend/"

    return {
        "success": True,
        "auto_login_url": api_url + auto_login_path,
    }


@frappe.whitelist()
def get_user_memberships():
    """Returns councils this user has been provisioned on."""
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        return []
    return frappe.get_all(
        "Hub Council Membership",
        filters={"user": user, "is_active": 1},
        fields=["council_code", "council_name", "provisioned_at"],
    )


@frappe.whitelist()
def get_company_members():
    """Returns all hub users belonging to the same company as the logged-in agent."""
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    if not frappe.db.exists("User Profile Extended", user):
        return []

    company = frappe.db.get_value("User Profile Extended", user, "company_name")
    if not company:
        return []

    members = frappe.get_all(
        "User Profile Extended",
        filters={"company_name": company},
        fields=["name", "full_name", "user_role", "is_officer"],
    )
    # Enrich with enabled status from User doctype
    for m in members:
        m["enabled"] = frappe.db.get_value("User", m["name"], "enabled") or 0
    return members


@frappe.whitelist()
def invite_company_member(email=None, first_name=None, last_name=None):
    """Invite a new staff member to join the agent's company on the hub."""
    inviter = frappe.session.user
    if inviter in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    if not email or not first_name:
        frappe.throw(_("Email and first name are required"))

    if not frappe.db.exists("User Profile Extended", inviter):
        frappe.throw(_("Your profile is not set up"))

    inviter_profile = frappe.get_doc("User Profile Extended", inviter)
    company = inviter_profile.company_name
    business_type = inviter_profile.business_type

    if not company:
        frappe.throw(_("You must have a company set up before inviting members"))

    # Create or get Frappe user
    if not frappe.db.exists("User", email):
        user_doc = frappe.get_doc({
            "doctype": "User",
            "email": email,
            "first_name": first_name,
            "last_name": last_name or "",
            "user_type": "Website User",
            "send_welcome_email": 0,
        })
        user_doc.flags.ignore_permissions = True
        user_doc.insert()
        # Send password reset link as invite (works without outgoing email config)
        try:
            frappe.sendmail(
                recipients=[email],
                subject=f"You've been invited to {company} on CouncilsOnline Hub",
                message=f"Hi {first_name},<br><br>"
                        f"You've been added to {company} on CouncilsOnline Hub.<br><br>"
                        f"Please visit the hub to set your password and get started.",
                now=True,
            )
        except Exception:
            pass  # Email sending is optional; user can be manually notified
    else:
        user_doc = frappe.get_doc("User", email)
        if not user_doc.enabled:
            user_doc.enabled = 1
            user_doc.save(ignore_permissions=True)

    # Add Agent role if missing
    existing_roles = [r.role for r in user_doc.roles]
    if "Agent" not in existing_roles:
        user_doc.append("roles", {"role": "Agent"})
        user_doc.save(ignore_permissions=True)

    # Create or update User Profile Extended
    if not frappe.db.exists("User Profile Extended", email):
        profile = frappe.get_doc({
            "doctype": "User Profile Extended",
            "user": email,
            "full_name": f"{first_name} {last_name or ''}".strip(),
            "company_name": company,
            "business_type": business_type,
            "user_role": "Agent",
            "is_officer": 0,
        })
        profile.flags.ignore_permissions = True
        profile.insert()
    else:
        profile = frappe.get_doc("User Profile Extended", email)
        profile.company_name = company
        profile.business_type = business_type
        profile.save(ignore_permissions=True)

    frappe.db.commit()
    return {"success": True, "email": email, "message": f"Invitation sent to {email}"}


# ---------------------------------------------------------------------------
# Agent Marketplace endpoints (public — no auth required)
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_agent_listings(search=None, service=None, area=None):
    """Return active, listed agents for the hub marketplace."""
    agents = frappe.get_all(
        "Agent Profile",
        filters={"is_listed": 1, "status": "Active"},
        fields=[
            "name", "display_name", "profile_image", "business_type",
            "company_name", "bio", "years_experience", "contact_email",
            "contact_phone", "website", "total_applications",
            "average_rating", "total_reviews",
        ],
        order_by="average_rating desc, total_applications desc",
        limit=100,
    )

    for agent in agents:
        agent["services"] = [
            s.service_name for s in frappe.get_all(
                "Agent Service",
                filters={"parent": agent["name"]},
                fields=["service_name"],
            )
        ]
        agent["areas"] = [
            a.area_name for a in frappe.get_all(
                "Agent Area",
                filters={"parent": agent["name"]},
                fields=["area_name"],
            )
        ]

    if service:
        agents = [a for a in agents if service in a["services"]]
    if area:
        agents = [a for a in agents if area in a["areas"]]
    if search:
        q = search.lower()
        agents = [
            a for a in agents
            if q in (a.get("display_name") or "").lower()
            or q in (a.get("company_name") or "").lower()
            or q in (a.get("bio") or "").lower()
        ]

    return {"agents": agents}


@frappe.whitelist(allow_guest=True)
def get_agent_marketplace_filters():
    """Return distinct services and areas for marketplace filter dropdowns."""
    services = sorted({
        s.service_name for s in frappe.get_all(
            "Agent Service",
            fields=["service_name"],
            filters={"parenttype": "Agent Profile"},
        ) if s.service_name
    })
    areas = sorted({
        a.area_name for a in frappe.get_all(
            "Agent Area",
            fields=["area_name"],
            filters={"parenttype": "Agent Profile"},
        ) if a.area_name
    })
    return {"services": services, "areas": areas}


@frappe.whitelist(allow_guest=True)
def get_agent_detail(agent_name=None):
    """Return full agent profile for the detail page."""
    if not agent_name:
        frappe.throw(_("agent_name is required"))

    if not frappe.db.exists("Agent Profile", agent_name):
        frappe.throw(_("Agent not found"), frappe.DoesNotExistError)

    profile = frappe.get_doc("Agent Profile", agent_name)

    if not profile.is_listed or profile.status != "Active":
        frappe.throw(_("Agent not found"), frappe.DoesNotExistError)

    return {
        "name": profile.name,
        "display_name": profile.display_name,
        "profile_image": profile.profile_image,
        "business_type": profile.business_type,
        "company_name": profile.company_name,
        "bio": profile.bio,
        "years_experience": profile.years_experience,
        "contact_email": profile.contact_email,
        "contact_phone": profile.contact_phone,
        "website": profile.website,
        "total_applications": profile.total_applications,
        "average_rating": profile.average_rating,
        "total_reviews": profile.total_reviews,
        "services": [{"service_name": s.service_name} for s in (profile.services or [])],
        "areas": [{"area_name": a.area_name} for a in (profile.areas or [])],
        "reviews": frappe.get_all(
            "Agent Review",
            filters={"agent_profile": agent_name},
            fields=["name", "reviewer_name", "rating", "title", "comment", "review_date"],
            order_by="review_date desc",
            limit=20,
        ),
    }


# ---------------------------------------------------------------------------
# NZ-547: Messaging proxy (hub → council)
# ---------------------------------------------------------------------------

def _get_council_entry(council_code):
    settings = frappe.get_single("CouncilsOnline Settings")
    for e in (getattr(settings, "council_registry", []) or []):
        if e.council_code == council_code:
            return e
    frappe.throw(_("Council not found"), frappe.DoesNotExistError)


@frappe.whitelist()
def get_request_messages(council_code, request_id):
    """Proxy: fetch communications for a request from the council site."""
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    entry = _get_council_entry(council_code)
    from frappe.utils.password import get_decrypted_password
    token = get_decrypted_password("CouncilsOnline Settings", "CouncilsOnline Settings", "hub_service_token")
    import requests as req
    resp = req.get(
        f"{entry.api_url.rstrip('/')}/api/method/councilsonline.api.requests.get_communications_from_hub",
        params={"request_id": request_id, "agent_email": user, "service_token": token},
        timeout=8,
    )
    if resp.status_code == 200:
        return resp.json().get("message") or {"data": []}
    frappe.throw(_("Could not retrieve messages from council"))


@frappe.whitelist()
def send_hub_request_message(council_code, request_id, subject, message):
    """Proxy: send a message to the council on behalf of the logged-in user."""
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    entry = _get_council_entry(council_code)
    from frappe.utils.password import get_decrypted_password
    token = get_decrypted_password("CouncilsOnline Settings", "CouncilsOnline Settings", "hub_service_token")
    import requests as req
    resp = req.post(
        f"{entry.api_url.rstrip('/')}/api/method/councilsonline.api.requests.send_message_from_hub",
        json={"request_id": request_id, "subject": subject, "message": message,
              "sender_email": user, "service_token": token},
        headers={"Content-Type": "application/json"},
        timeout=8,
    )
    if resp.status_code == 200:
        return resp.json().get("message") or {"status": "ok"}
    frappe.throw(_("Could not send message to council"))


# ---------------------------------------------------------------------------
# NZ-674: Agent marketplace profile management
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_my_agent_profile():
    """Return the current user's Agent Profile (marketplace listing data)."""
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    profile = frappe.db.get_value("Agent Profile", {"user": user}, "name")
    if not profile:
        return {"exists": False}

    doc = frappe.get_doc("Agent Profile", profile)
    return {
        "exists": True,
        "name": doc.name,
        "display_name": doc.display_name or "",
        "bio": doc.bio or "",
        "is_listed": int(doc.is_listed or 0),
        "status": doc.status or "Active",
        "business_type": doc.business_type or "",
        "contact_email": doc.contact_email or "",
        "contact_phone": doc.contact_phone or "",
        "website": doc.website or "",
        "services": [s.service_name for s in (doc.services or [])],
        "areas": [a.area_name for a in (doc.areas or [])],
    }


@frappe.whitelist()
def save_agent_profile(is_listed, status, services=None, areas=None,
                       bio=None, display_name=None, contact_email=None,
                       contact_phone=None, website=None):
    """Update the current user's Agent Profile marketplace fields."""
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        frappe.throw(_("You must be logged in"), frappe.PermissionError)

    import json as _json
    services_list = _json.loads(services) if isinstance(services, str) else (services or [])
    areas_list = _json.loads(areas) if isinstance(areas, str) else (areas or [])

    profile_name = frappe.db.get_value("Agent Profile", {"user": user}, "name")
    if not profile_name:
        frappe.throw(_("Agent Profile not found. Complete your hub profile first."))

    doc = frappe.get_doc("Agent Profile", profile_name)
    doc.is_listed = int(is_listed)
    doc.status = status
    if bio is not None:
        doc.bio = bio
    if display_name is not None:
        doc.display_name = display_name
    if contact_email is not None:
        doc.contact_email = contact_email
    if contact_phone is not None:
        doc.contact_phone = contact_phone
    if website is not None:
        doc.website = website

    doc.services = []
    for svc in services_list:
        if svc:
            doc.append("services", {"service_name": svc})

    doc.areas = []
    for area in areas_list:
        if area:
            doc.append("areas", {"area_name": area})

    doc.save(ignore_permissions=True)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# NZ-676: Council registry admin
# ---------------------------------------------------------------------------

def _require_system_manager():
    if "System Manager" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("System Manager role required"), frappe.PermissionError)


@frappe.whitelist()
def get_council_registry_all():
    """Return all council registry entries (active and inactive). System Manager only."""
    _require_system_manager()
    settings = frappe.get_single("CouncilsOnline Settings")
    return [
        {
            "name": e.name,
            "council_name": e.council_name,
            "council_code": e.council_code,
            "api_url": e.api_url,
            "is_active": int(e.is_active or 0),
        }
        for e in (getattr(settings, "council_registry", []) or [])
    ]


@frappe.whitelist()
def save_council_registry_entry(council_name, council_code, api_url, is_active, entry_name=None):
    """Create or update a council registry entry. System Manager only."""
    _require_system_manager()
    settings = frappe.get_single("CouncilsOnline Settings")
    registry = getattr(settings, "council_registry", []) or []

    if entry_name:
        for e in registry:
            if e.name == entry_name:
                e.council_name = council_name
                e.council_code = council_code
                e.api_url = api_url.rstrip("/")
                e.is_active = int(is_active)
                break
        else:
            frappe.throw(_("Entry not found"))
    else:
        # Check for duplicate council_code
        for e in registry:
            if e.council_code == council_code:
                frappe.throw(_("A council with code {0} already exists").format(council_code))
        settings.append("council_registry", {
            "council_name": council_name,
            "council_code": council_code,
            "api_url": api_url.rstrip("/"),
            "is_active": int(is_active),
        })

    settings.save(ignore_permissions=True)
    return {"status": "ok"}


@frappe.whitelist()
def delete_council_registry_entry(entry_name):
    """Delete a council registry entry. System Manager only."""
    _require_system_manager()
    settings = frappe.get_single("CouncilsOnline Settings")
    registry = getattr(settings, "council_registry", []) or []
    original_len = len(registry)
    settings.council_registry = [e for e in registry if e.name != entry_name]
    if len(settings.council_registry) == original_len:
        frappe.throw(_("Entry not found"))
    settings.save(ignore_permissions=True)
    return {"status": "ok"}
