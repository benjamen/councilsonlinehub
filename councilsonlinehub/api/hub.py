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

    settings = frappe.get_single("CouncilsOnline Settings")
    entry = next(
        (e for e in (settings.council_registry or [])
         if e.council_code == council_code and e.is_active),
        None,
    )
    if not entry:
        frappe.throw(_("Council not found in registry"))

    api_url = (entry.api_url or "").rstrip("/")
    token = settings.hub_service_token

    # Build full profile (reuse existing service endpoint)
    profile_data = get_agent_profile_for_council(agent_email=user, service_token=token)

    # Augment with name + contact (get_agent_profile_for_council omits these)
    if frappe.db.exists("User", user):
        u = frappe.get_doc("User", user)
        profile_data["first_name"] = u.first_name
        profile_data["last_name"] = u.last_name
        profile_data["phone"] = (
            frappe.db.get_value("User Profile Extended", user, "phone") or u.phone or ""
        )
    if frappe.db.exists("User Profile Extended", user):
        p = frappe.get_doc("User Profile Extended", user)
        profile_data["company_name"] = p.company_name
        profile_data["business_type"] = p.business_type
        profile_data["user_role"] = p.user_role

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
    return {
        "success": True,
        "auto_login_url": api_url + auto_login_path,
    }


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
