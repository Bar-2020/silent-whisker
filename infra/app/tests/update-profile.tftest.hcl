# PROF-17, D-62

mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "archive" {}

run "the_profile_save_is_a_route_with_its_own_limit" {
  command = apply

  assert {
    condition     = contains(keys(aws_apigatewayv2_route.route), "PATCH /api/profile")
    error_message = "PATCH /api/profile must be a route of the API (carrying the authorizer and a throttle, which the other tests check for every route)."
  }

  assert {
    condition = (
      local.api.routes["PATCH /api/profile"].rate_per_second == 1 &&
      local.api.routes["PATCH /api/profile"].burst == 2
    )
    error_message = "D-61: PATCH /api/profile is throttled to 1 a second, burst 2."
  }
}

run "the_profile_save_role_reaches_only_what_the_save_needs" {
  command = apply

  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_role_policy.update_profile.policy).Statement :
      flatten([s.Resource]) == [aws_dynamodb_table.users.arn] &&
      toset(flatten([s.Action])) == toset(["dynamodb:GetItem", "dynamodb:UpdateItem"])
    ])
    error_message = "The members table: read and update only. The row is made by GET /profile, and nothing deletes a member's row here."
  }

  assert {
    condition = alltrue([
      for s in jsondecode(aws_iam_role_policy.update_profile.policy).Statement :
      !anytrue([for a in flatten([s.Action]) : startswith(a, "dynamodb:Delete")]) &&
      !contains(flatten([s.Resource]), "*")
    ])
    error_message = "No delete right and no wildcard resource anywhere in the role."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_role_policy.update_profile.policy).Statement :
      flatten([s.Action]) == ["sns:Publish"] && flatten([s.Resource]) == [aws_sns_topic.cost_alerts.arn]
    ])
    error_message = "It may publish only to the cost alert topic (the breaker's email, D-52)."
  }

  assert {
    condition     = aws_iam_role_policy_attachment.update_profile_text_moderation.policy_arn == aws_iam_policy.text_moderation.arn
    error_message = "The role gets the text moderation guardrail's policy, which allows only ApplyGuardrail."
  }
}

run "the_profile_save_gets_its_tables_topic_and_guardrail_by_name" {
  command = apply

  assert {
    condition = (
      aws_lambda_function.update_profile.environment[0].variables["USERS_TABLE"] == aws_dynamodb_table.users.name &&
      aws_lambda_function.update_profile.environment[0].variables["GEOCODE_TABLE"] == aws_dynamodb_table.geocode_cache.name &&
      aws_lambda_function.update_profile.environment[0].variables["COUNTERS_TABLE"] == aws_dynamodb_table.daily_usage_counters.name &&
      aws_lambda_function.update_profile.environment[0].variables["ALERT_TOPIC_ARN"] == aws_sns_topic.cost_alerts.arn &&
      aws_lambda_function.update_profile.environment[0].variables["GUARDRAIL_ID"] == aws_bedrock_guardrail.text_moderation.guardrail_id &&
      aws_lambda_function.update_profile.environment[0].variables["GUARDRAIL_VERSION"] == aws_bedrock_guardrail_version.text_moderation.version
    )
    error_message = "The handler reads these six settings (backend/update-profile/): a missing one fails every save."
  }

  assert {
    condition     = aws_lambda_function.update_profile.timeout == local.api.update_profile.timeout_seconds
    error_message = "The save has its own timeout: a geocoder slot and two outside calls need more than the default."
  }
}
