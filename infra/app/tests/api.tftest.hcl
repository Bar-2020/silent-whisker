# The API front door against a mock AWS (see infra/README.md). It cannot be called past its limit
# without a deployed API and a real sign-in, so these tests prove the settings that make it refuse
# (D-60). Each run's error message says what rule it guards.

mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "archive" {}

run "every_route_requires_a_valid_sign_in" {
  command = apply

  assert {
    condition     = length(aws_apigatewayv2_route.route) > 0
    error_message = "The API has no routes: the test would pass on nothing."
  }

  assert {
    condition = alltrue([
      for r in values(aws_apigatewayv2_route.route) :
      r.authorization_type == "JWT" && r.authorizer_id == aws_apigatewayv2_authorizer.members.id
    ])
    error_message = "Every route must carry the JWT authorizer (R-22): a route without it answers anyone."
  }
}

run "every_route_has_its_own_throttle_from_the_constants" {
  command = apply

  assert {
    condition = alltrue([
      for k in keys(aws_apigatewayv2_route.route) : anytrue([
        for s in aws_apigatewayv2_stage.default.route_settings :
        s.route_key == k &&
        s.throttling_rate_limit == local.api.routes[k].rate_per_second &&
        s.throttling_burst_limit == local.api.routes[k].burst
      ])
    ])
    error_message = "Every route needs a throttle read from shared/constants/api.json (R-21, D-60)."
  }

  assert {
    condition = (
      toset(keys(aws_apigatewayv2_route.route)) == toset(keys(local.api.routes)) &&
      alltrue([for r in values(local.api.routes) : r.rate_per_second > 0 && r.burst > 0])
    )
    error_message = "The routes in shared/constants/api.json and in api.tf must be the same, each with a limit above zero."
  }
}

run "the_authorizer_trusts_only_this_pool_and_this_app" {
  command = apply

  assert {
    condition = (
      aws_apigatewayv2_authorizer.members.authorizer_type == "JWT" &&
      one(aws_apigatewayv2_authorizer.members.jwt_configuration).issuer == "https://${aws_cognito_user_pool.members.endpoint}" &&
      one(aws_apigatewayv2_authorizer.members.jwt_configuration).audience == toset([aws_cognito_user_pool_client.web.id])
    )
    error_message = "Only tokens from this user pool, made for this app client, may pass (R-22, D-59)."
  }

  assert {
    condition     = aws_apigatewayv2_authorizer.members.identity_sources == toset(["$request.header.Authorization"])
    error_message = "The token comes in the Authorization header."
  }
}

run "api_calls_go_through_cloudfront_uncached_and_without_the_page_fallback" {
  command = apply

  assert {
    condition = anytrue([
      for b in aws_cloudfront_distribution.site.ordered_cache_behavior :
      b.path_pattern == "/api/*" &&
      b.cache_policy_id == data.aws_cloudfront_cache_policy.disabled.id &&
      b.origin_request_policy_id == data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id &&
      length(b.function_association) == 0
    ])
    error_message = "/api/* must reach the API uncached, with every header but Host, and without the page fallback (D-60, D-63)."
  }

  assert {
    condition = (
      data.aws_cloudfront_cache_policy.disabled.name == "Managed-CachingDisabled" &&
      data.aws_cloudfront_origin_request_policy.all_viewer_except_host.name == "Managed-AllViewerExceptHostHeader"
    )
    error_message = "The two policies must be AWS's CachingDisabled and AllViewerExceptHostHeader: an answer about one member must never be cached."
  }

  assert {
    condition = alltrue([
      for b in aws_cloudfront_distribution.site.ordered_cache_behavior :
      contains(b.allowed_methods, "POST") && contains(b.allowed_methods, "PATCH")
    ])
    error_message = "/api/* must pass POST and PATCH through, or writes never reach the API."
  }

  assert {
    condition = alltrue([
      for o in aws_cloudfront_distribution.site.origin :
      o.origin_id != "api" || one(o.custom_origin_config).origin_protocol_policy == "https-only"
    ])
    error_message = "CloudFront must reach the API over HTTPS only."
  }
}

run "the_members_table_is_protected_and_inside_the_free_units" {
  command = apply

  assert {
    condition     = aws_dynamodb_table.users.deletion_protection_enabled
    error_message = "The rows are the members' data: AWS must refuse to delete the table."
  }

  assert {
    condition = (
      aws_dynamodb_table.users.billing_mode == "PROVISIONED" &&
      aws_dynamodb_table.users.read_capacity == 1 &&
      aws_dynamodb_table.users.write_capacity == 1 &&
      aws_dynamodb_table.users.hash_key == "user_id"
    )
    error_message = "users is provisioned at 1 read and 1 write unit, keyed by user_id (D-26, DATA.md)."
  }
}

run "the_profile_handler_touches_only_the_users_table_and_cannot_delete" {
  command = apply

  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_role_policy.get_profile.policy).Statement :
      contains(flatten([s.Action]), "dynamodb:GetItem") &&
      flatten([s.Resource]) == [aws_dynamodb_table.users.arn] &&
      !anytrue([for a in flatten([s.Action]) : startswith(a, "dynamodb:Delete")])
    ])
    error_message = "The handler may read and write only the users table, and never delete a row (no hard deletes)."
  }

  assert {
    condition = alltrue([
      for s in jsondecode(aws_iam_role_policy.get_profile.policy).Statement :
      !contains(flatten([s.Resource]), "*")
    ])
    error_message = "No statement of the handler's role may name every resource."
  }

  assert {
    condition = alltrue([
      for p in values(aws_lambda_permission.route) : p.principal == "apigateway.amazonaws.com"
    ])
    error_message = "Only the API may start a handler."
  }
}
