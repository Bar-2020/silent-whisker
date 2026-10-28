# Who may sign in (D-59): a Cognito user pool, the list of members, where Google is the only way
# in. The app sends the visitor straight to Google, so Cognito's own sign-in page is never seen.
# The limits (the refresh token's life, the app's return address) are in shared/constants/auth.json.

locals {
  auth     = jsondecode(file("${path.module}/../../shared/constants/auth.json"))
  site_url = "https://${aws_cloudfront_distribution.site.domain_name}"

  # Google is switched on only when both of its values exist: pull-request checks and the first
  # deploy have no secret, and must still pass.
  google_enabled = var.google_client_id != "" && nonsensitive(var.google_client_secret) != ""
}

# From the Google sign-in client made by hand (Google Auth Platform, Clients). The id is not secret
# and is a repository variable; the secret is a secret of the production environment, never
# committed (the repository is public). Terraform's state file holds a copy; that bucket is
# private and only the deployer role reads it.
variable "google_client_id" {
  description = "Google sign-in client id (GitHub variable GOOGLE_CLIENT_ID)."
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google sign-in client secret (GitHub secret GOOGLE_CLIENT_SECRET)."
  type        = string
  default     = ""
  sensitive   = true
}

resource "aws_cognito_user_pool" "members" {
  name = "silent-whisker-members"

  # Deleting the pool would delete every member, so AWS refuses until this is switched off.
  deletion_protection = "ACTIVE"

  # Free for the first 10,000 active members a month, like Lite (AWS.md), and the plan that offers
  # the newer sign-in pages later.
  user_pool_tier = "ESSENTIALS"

  # Nobody makes an account with a password: members exist only by signing in with Google.
  admin_create_user_config {
    allow_admin_create_user_only = true
  }
}

# The sign-in address: <prefix>.auth.<region>.amazoncognito.com. The prefix is part of the redirect
# address registered in the Google client, so changing it means changing that too.
resource "aws_cognito_user_pool_domain" "members" {
  domain       = local.auth.domain_prefix
  user_pool_id = aws_cognito_user_pool.members.id
}

resource "aws_cognito_identity_provider" "google" {
  count         = local.google_enabled ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.members.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  # `picture` is what lets the app show the member's Google photo (D-21); it rides in the ID token.
  attribute_mapping = {
    username = "sub"
    email    = "email"
    name     = "name"
    picture  = "picture"
  }
}

# The web app's registration: a public client (a browser cannot keep a secret) using the
# authorization code flow, which the app runs with PKCE.
resource "aws_cognito_user_pool_client" "web" {
  name         = "silent-whisker-web"
  user_pool_id = aws_cognito_user_pool.members.id

  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  # Exact addresses only: the live app and the developer's own machine.
  callback_urls = [
    "${local.site_url}${local.auth.callback_path}",
    "${local.auth.dev_origin}${local.auth.callback_path}",
  ]
  logout_urls = ["${local.site_url}/", "${local.auth.dev_origin}/"]

  supported_identity_providers = local.google_enabled ? [aws_cognito_identity_provider.google[0].provider_name] : ["COGNITO"]

  # Every attribute mapped from Google must be writable here, or Cognito fails the sign-in.
  read_attributes  = ["email", "name", "picture"]
  write_attributes = ["email", "name", "picture"]

  # No direct password flows. Refresh token rotation and ALLOW_REFRESH_TOKEN_AUTH do not go
  # together; the app refreshes through the token endpoint.
  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH"]

  # Cognito's own hour for the ID and access tokens is kept; only the refresh token is set.
  refresh_token_validity = local.auth.refresh_token_days
  token_validity_units {
    refresh_token = "days"
  }

  # The tokens live in the browser (D-59), so each refresh hands out a new refresh token and the
  # old one dies, and a member can be signed out by revoking theirs.
  enable_token_revocation = true
  refresh_token_rotation {
    feature                    = "ENABLED"
    retry_grace_period_seconds = local.auth.refresh_rotation_grace_seconds
  }

  prevent_user_existence_errors = "ENABLED"
}
