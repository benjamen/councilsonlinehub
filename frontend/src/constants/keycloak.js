/**
 * Keycloak SSO configuration for CouncilsOnline
 *
 * Two realms:
 *   PH councils → councilsonline        (client: councilsonline-app, provider: keycloak)
 *   NZ councils → councilsonline-nz     (client: councilsonline-nz-app, provider: keycloak-nz)
 *
 * Multi-council safe: redirect_uri is built from window.location.origin at
 * runtime, so the same compiled bundle works for every council site without
 * rebuilding.  Each site just needs its own Social Login Key in Frappe and
 * its redirect URI added to the relevant Keycloak client.
 *
 * Uses Frappe's custom/<provider> callback which:
 *   - Accepts a state param (required by login_oauth_user)
 *   - Looks up the correct Social Login Key by provider name
 */

const KC_HOST  = 'https://login.councilsonline.com'
const SCOPE    = 'openid email profile'

const REALM_CONFIG = {
  NZ: {
    realm:     'councilsonline-nz',
    clientId:  'councilsonline-nz-app',
    provider:  'keycloak-nz',
  },
  PH: {
    realm:     'councilsonline',
    clientId:  'councilsonline-app',
    provider:  'keycloak',
  },
}

function getRealmConfig(countryCode = 'PH') {
  return REALM_CONFIG[countryCode?.toUpperCase()] ?? REALM_CONFIG.PH
}

/** Generate a minimal Frappe-compatible OAuth2 state token */
function generateState(redirectTo = '', siteUrl = '') {
  const state = {
    site: siteUrl || window.location.origin,
    token: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    redirect_to: redirectTo,
  }
  return btoa(JSON.stringify(state))
}

function buildUrl(endpoint, countryCode, extra = {}, siteUrl = '') {
  const { realm, clientId, provider } = getRealmConfig(countryCode)
  const base        = `${KC_HOST}/realms/${realm}`
  // Use server-configured siteUrl when available to avoid 127.0.0.1/hostname mismatch in dev
  const origin      = siteUrl || window.location.origin
  const redirectUri = `${origin}/api/method/frappe.integrations.oauth2_logins.custom/${provider}`
  const params = new URLSearchParams({
    client_id:     clientId,
    response_type: 'code',
    scope:         SCOPE,
    redirect_uri:  redirectUri,
    state:         generateState('/frontend/hub/dashboard', siteUrl),
    ...extra,
  })
  return `${base}${endpoint}?${params.toString()}`
}

/** Redirects the browser to the Keycloak login page */
export function getLoginUrl(countryCode = 'PH', siteUrl = '') {
  return buildUrl('/protocol/openid-connect/auth', countryCode, {}, siteUrl)
}

/** Redirects to Keycloak registration, optionally pre-hinting user type */
export function getRegisterUrl(userType, countryCode = 'PH', siteUrl = '') {
  return buildUrl('/protocol/openid-connect/registrations', countryCode, {
    login_hint: userType,
  }, siteUrl)
}
