# PROF-27, R-21, R-22, D-60, D-109
mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "archive" {}

run "the_profile_delete_is_a_route_with_its_own_limit" {
  command = apply

  assert {
    condition     = contains(keys(aws_apigatewayv2_route.route), "DELETE /api/profile")
    error_message = "DELETE /api/profile must be a route of the API (R-22, D-60)."
  }

  assert {
    condition = (
      local.api.routes["DELETE /api/profile"].rate_per_second == 1 &&
      local.api.routes["DELETE /api/profile"].burst == 2
    )
    error_message = "DELETE /api/profile must be throttled to 1 a second, burst 2 (R-21, D-60)."
  }
}

run "the_profile_delete_role_reaches_only_what_the_delete_needs" {
  command = apply

  assert {
    condition = anytrue([
      for s in jsondecode(module.delete_profile.role_policy.policy).Statement :
      flatten([s.Resource]) == [aws_dynamodb_table.users.arn] &&
      toset(flatten([s.Action])) == toset(["dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"])
    ])
    error_message = "The delete role must get, update and delete in the users table, and nothing more there (D-109)."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(module.delete_profile.role_policy.policy).Statement :
      flatten([s.Resource]) == [aws_dynamodb_table.daily_usage_counters.arn] &&
      toset(flatten([s.Action])) == toset(["dynamodb:UpdateItem"])
    ])
    error_message = "The delete role must only update the counters table (the write limit and the marker, D-109)."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(module.delete_profile.role_policy.policy).Statement :
      flatten([s.Resource]) == [aws_cognito_user_pool.members.arn] &&
      toset(flatten([s.Action])) == toset(["cognito-idp:AdminDeleteUser", "cognito-idp:AdminDisableUser"])
    ])
    error_message = "The delete role must delete and disable users of this user pool only (D-109)."
  }

  assert {
    condition = alltrue([
      for s in jsondecode(module.delete_profile.role_policy.policy).Statement :
      !anytrue([for a in flatten([s.Action]) : startswith(a, "dynamodb:Put")]) &&
      !contains(flatten([s.Resource]), "*")
    ])
    error_message = "The delete role must have no PutItem (it could make a row) and no wildcard resource (D-109)."
  }
}

run "the_profile_delete_settings_are_wired_by_name" {
  command = apply

  assert {
    condition = (
      module.delete_profile.function.environment[0].variables["USERS_TABLE"] == aws_dynamodb_table.users.name
    )
    error_message = "USERS_TABLE must be the users table name."
  }

  assert {
    condition = (
      module.delete_profile.function.environment[0].variables["COUNTERS_TABLE"] == aws_dynamodb_table.daily_usage_counters.name
    )
    error_message = "COUNTERS_TABLE must be the daily usage counters table name."
  }

  assert {
    condition = (
      module.delete_profile.function.environment[0].variables["USER_POOL_ID"] == aws_cognito_user_pool.members.id
    )
    error_message = "USER_POOL_ID must be the id of the members user pool."
  }
}

run "the_profile_read_gets_the_counters_table_and_may_only_read_it" {
  command = apply

  assert {
    condition = (
      module.get_profile.function.environment[0].variables["COUNTERS_TABLE"] == aws_dynamodb_table.daily_usage_counters.name
    )
    error_message = "GET /profile must get the counters table name in COUNTERS_TABLE, for the deleted-account marker (D-109)."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(module.get_profile.role_policy.policy).Statement :
      flatten([s.Resource]) == [aws_dynamodb_table.daily_usage_counters.arn] &&
      toset(flatten([s.Action])) == toset(["dynamodb:GetItem"])
    ])
    error_message = "GET /profile must only read (GetItem) the counters table (D-109)."
  }

  assert {
    condition = alltrue([
      for s in jsondecode(module.get_profile.role_policy.policy).Statement :
      flatten([s.Resource]) != [aws_dynamodb_table.daily_usage_counters.arn] ||
      toset(flatten([s.Action])) == toset(["dynamodb:GetItem"])
    ])
    error_message = "No statement of the GET /profile role may give more than GetItem on the counters table."
  }
}

run "the_id_token_lives_as_long_as_the_marker_assumes" {
  command = apply

  assert {
    condition     = aws_cognito_user_pool_client.web.id_token_validity == local.auth.id_token_seconds
    error_message = "The app client's id_token_validity must be id_token_seconds from shared/constants/auth.json: the deleted-account marker lives that long (D-109)."
  }

  assert {
    condition     = one(aws_cognito_user_pool_client.web.token_validity_units).id_token == "seconds"
    error_message = "The app client must count the ID token's life in seconds."
  }
}
