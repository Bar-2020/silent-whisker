# The sign-in pieces against a mock AWS (see infra/README.md). Each run's error message says what
# rule it guards, because a failure here means a way into the app that was not meant to exist.

mock_provider "aws" {
  mock_data "aws_cloudfront_cache_policy" {
    defaults = { id = "658327ea-f89d-4fab-a63d-7e88639e58f6" }
  }

  # The distribution checks the function ARN's shape, so the mock needs a realistic one.
  mock_resource "aws_cloudfront_function" {
    defaults = { arn = "arn:aws:cloudfront::123456789012:function/silent-whisker-spa-fallback" }
  }
}

run "google_is_the_only_way_in" {
  command = apply

  variables {
    google_client_id     = "1234.apps.googleusercontent.com"
    google_client_secret = "not-a-real-secret"
  }

  assert {
    condition = (
      length(aws_cognito_identity_provider.google) == 1 &&
      aws_cognito_identity_provider.google[0].provider_type == "Google"
    )
    error_message = "With both Google values set, Google must be a provider of the user pool."
  }

  assert {
    condition     = aws_cognito_user_pool_client.web.supported_identity_providers == toset(["Google"])
    error_message = "The app client must list Google and nothing else, so no password sign-in exists."
  }

  assert {
    condition     = one(aws_cognito_user_pool.members.admin_create_user_config).allow_admin_create_user_only
    error_message = "Nobody may make an account with a password: members come only from Google."
  }
}

run "no_google_provider_without_both_values" {
  command = apply

  assert {
    condition     = length(aws_cognito_identity_provider.google) == 0
    error_message = "Without GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET there must be no Google provider."
  }
}

run "no_google_provider_with_only_the_id" {
  command = apply

  variables {
    google_client_id = "1234.apps.googleusercontent.com"
  }

  assert {
    condition     = length(aws_cognito_identity_provider.google) == 0
    error_message = "One of the two Google values is not enough: no provider without the secret."
  }
}

run "the_user_pool_cannot_be_deleted_by_accident" {
  command = apply

  assert {
    condition     = aws_cognito_user_pool.members.deletion_protection == "ACTIVE"
    error_message = "Deleting the pool deletes every member, so deletion protection must stay on."
  }
}

run "the_app_client_is_a_public_code_flow_client" {
  command = apply

  assert {
    condition     = !aws_cognito_user_pool_client.web.generate_secret
    error_message = "A browser cannot keep a secret, so the app client must have none."
  }

  assert {
    condition = (
      aws_cognito_user_pool_client.web.allowed_oauth_flows == toset(["code"]) &&
      aws_cognito_user_pool_client.web.allowed_oauth_flows_user_pool_client
    )
    error_message = "Only the authorization code flow is allowed: no implicit flow returning tokens in the address."
  }

  assert {
    condition     = aws_cognito_user_pool_client.web.allowed_oauth_scopes == toset(["openid", "email", "profile"])
    error_message = "The app asks only for openid, email and profile; nothing that lets a token edit the account."
  }

  assert {
    condition     = aws_cognito_user_pool_client.web.explicit_auth_flows == toset(["ALLOW_USER_SRP_AUTH"])
    error_message = "No direct sign-in flows beyond the one the user pool needs; refresh rotation excludes ALLOW_REFRESH_TOKEN_AUTH."
  }
}

run "the_refresh_token_expires_and_rotates" {
  command = apply

  assert {
    condition = (
      aws_cognito_user_pool_client.web.refresh_token_validity == 30 &&
      one(aws_cognito_user_pool_client.web.token_validity_units).refresh_token == "days"
    )
    error_message = "The refresh token lives 30 days, from shared/constants/auth.json (D-59)."
  }

  assert {
    condition = (
      aws_cognito_user_pool_client.web.enable_token_revocation &&
      one(aws_cognito_user_pool_client.web.refresh_token_rotation).feature == "ENABLED"
    )
    error_message = "Tokens sit in the browser (D-59), so revocation and refresh token rotation must be on."
  }
}

run "sign_in_returns_only_to_this_app_or_localhost" {
  command = apply

  assert {
    condition = alltrue([
      for url in setunion(aws_cognito_user_pool_client.web.callback_urls, aws_cognito_user_pool_client.web.logout_urls) :
      startswith(url, "https://${aws_cloudfront_distribution.site.domain_name}/") || startswith(url, "http://localhost:")
    ])
    error_message = "Callback and sign-out addresses may only be the live app or a local developer machine."
  }

  assert {
    condition = (
      contains(aws_cognito_user_pool_client.web.callback_urls, "https://${aws_cloudfront_distribution.site.domain_name}/auth/callback") &&
      contains(aws_cognito_user_pool_client.web.callback_urls, "http://localhost:5173/auth/callback")
    )
    error_message = "The live app and the local developer machine must both be allowed to receive the sign-in."
  }
}

run "the_sign_in_address_matches_the_google_client" {
  command = apply

  assert {
    condition     = aws_cognito_user_pool_domain.members.domain == "silent-whisker-auth"
    error_message = "This prefix is inside the redirect address registered in the Google client; change both together."
  }
}

run "google_photo_and_name_reach_the_token" {
  command = apply

  variables {
    google_client_id     = "1234.apps.googleusercontent.com"
    google_client_secret = "not-a-real-secret"
  }

  assert {
    condition = (
      aws_cognito_identity_provider.google[0].attribute_mapping["picture"] == "picture" &&
      aws_cognito_identity_provider.google[0].attribute_mapping["username"] == "sub"
    )
    error_message = "Google's picture must be mapped (D-21) and the member's id must be Google's sub."
  }

  assert {
    condition = (
      contains(aws_cognito_user_pool_client.web.read_attributes, "picture") &&
      contains(aws_cognito_user_pool_client.web.write_attributes, "picture")
    )
    error_message = "The app client must read the picture, and write it, or Cognito fails the sign-in."
  }
}
