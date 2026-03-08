import frappe
from frappe.integrations.oauth2_logins import decoder_compat
from frappe.utils.oauth import get_info_via_oauth, login_oauth_user
from councilsonlinehub.api.keycloak_nz import sync_nz_attributes

# Keycloak userType → Frappe role (public portal users only).
# Council staff (Council Admin, Consent Officer, etc.) are created and
# managed directly in Frappe by each council's admin — they never go
# through Keycloak registration.
KEYCLOAK_ROLE_MAP = {
	"Applicant": "Applicant",
	"Agent":     "Agent",
}

# If the user already has any of these roles, skip auto-assignment so that
# manually-granted roles are never overwritten.
MANAGED_ROLES = set(KEYCLOAK_ROLE_MAP.values()) | {
	"Field Validator", "Cashier",
	"Council Admin", "Council Manager", "Council Staff", "Council Planner",
	"Consent Officer", "Consent Planner", "Consent Manager",
	"CouncilsOnline Admin", "CouncilsOnline Manager",
}


@frappe.whitelist(allow_guest=True)
def login_via_keycloak(code: str, state: str):
	"""Keycloak SSO callback — assigns Applicant or Agent role on first login.

	Only public portal users go through Keycloak. Council staff are created
	in Frappe and log in via the standard Frappe /login page.
	"""
	info = get_info_via_oauth("keycloak", code, decoder_compat)
	user_type_claim = (info.get("userType") or "").strip()

	login_oauth_user(info, provider="keycloak", state=state)

	if user_type_claim and frappe.session.user not in ("", "Guest"):
		_maybe_assign_role(frappe.session.user, user_type_claim)

	# Sync NZ-specific attributes (security questions, business details, etc.)
	# Only runs when the NZ realm client is used; no-op for PH.
	sync_nz_attributes(frappe.session.user, info)


def _maybe_assign_role(email: str, user_type_claim: str):
	"""Assign Frappe role from Keycloak userType if not already configured."""
	role = KEYCLOAK_ROLE_MAP.get(user_type_claim)
	if not role:
		return

	try:
		user = frappe.get_doc("User", email)
	except frappe.DoesNotExistError:
		return

	existing_roles = {r.role for r in user.roles}
	if existing_roles & MANAGED_ROLES:
		return

	user.add_roles(role)
	frappe.db.commit()
	frappe.logger().info(f"SSO: auto-assigned role '{role}' to {email}")
