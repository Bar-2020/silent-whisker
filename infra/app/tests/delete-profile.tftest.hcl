# PROF-27, R-21, R-22, D-60, D-109
mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "archive" {}

run "delete_route_exists_with_its_throttle" {
  command = apply

  assert {
    condition     = contains(keys(local.api.routes), "DELETE /api/profile")
    error_message = "The route DELETE /api/profile must exist (PROF-27)."
  }

  assert {
    condition     = contains(keys(aws_apigatewayv2_route.route), "DELETE /api/profile")
    error_message = "DELETE /api/profile must be a route of the API, with the authorizer and the throttle the other tests check for every route."
  }

  assert {
    condition     = local.api.routes["DELETE /api/profile"].rate_per_second == 1
    error_message = "DELETE /api/profile must be throttled to 1 request a second (R-21, D-60)."
  }

  assert {
    condition     = local.api.routes["DELETE /api/profile"].burst == 2
    error_message = "DELETE /api/profile must have a burst of 2 (R-21, D-60)."
  }
}

run "delete_role_may_only_get_and_update_users" {
  command = apply

  assert {
    condition = anytrue([
      for s in jsondecode(module.delete_profile.role_policy.policy).Statement :
      contains(flatten([s.Resource]), aws_dynamodb_table.users.arn)
      && toset(flatten([s.Action])) == toset(["dynamodb:GetItem", "dynamodb:UpdateItem"])
    ])
    error_message = "The delete role must have a statement for the users table with exactly GetItem and UpdateItem (D-109)."
  }

  assert {
    condition = alltrue([
      for s in jsondecode(module.delete_profile.role_policy.policy).Statement :
      !contains(flatten([s.Resource]), aws_dynamodb_table.users.arn)
      || toset(flatten([s.Action])) == toset(["dynamodb:GetItem", "dynamodb:UpdateItem"])
    ])
    error_message = "No statement on the users table may grant anything beyond GetItem and UpdateItem (D-109)."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(module.delete_profile.role_policy.policy).Statement :
      contains(flatten([s.Resource]), aws_cognito_user_pool.members.arn)
      && toset(flatten([s.Action])) == toset(["cognito-idp:AdminDisableUser"])
    ])
    error_message = "The delete role must have a statement for this user pool with exactly AdminDisableUser (D-109)."
  }

  assert {
    condition = alltrue([
      for s in jsondecode(module.delete_profile.role_policy.policy).Statement :
      !contains(flatten([s.Resource]), aws_cognito_user_pool.members.arn)
      || toset(flatten([s.Action])) == toset(["cognito-idp:AdminDisableUser"])
    ])
    error_message = "No statement on the user pool may grant anything beyond AdminDisableUser (D-109)."
  }

  assert {
    condition = alltrue([
      for s in jsondecode(module.delete_profile.role_policy.policy).Statement : alltrue([
        for a in flatten([s.Action]) :
        !startswith(a, "dynamodb:Put") && !startswith(a, "dynamodb:Delete") && !startswith(a, "cognito-idp:AdminDelete") && !endswith(a, "*")
      ])
    ])
    error_message = "The delete role must not allow PutItem, DeleteItem, deleting Cognito users, or any wildcard action (D-109)."
  }

  assert {
    condition = alltrue([
      for s in jsondecode(module.delete_profile.role_policy.policy).Statement :
      !contains(flatten([s.Resource]), "*")
    ])
    error_message = "The delete role must not have a wildcard resource (PROF-27)."
  }
}

run "delete_settings_are_wired_without_counters" {
  command = apply

  assert {
    condition     = module.delete_profile.function.environment[0].variables["USERS_TABLE"] == aws_dynamodb_table.users.name
    error_message = "USERS_TABLE must name the users table."
  }

  assert {
    condition     = module.delete_profile.function.environment[0].variables["USER_POOL_ID"] == aws_cognito_user_pool.members.id
    error_message = "USER_POOL_ID must be this user pool."
  }

  assert {
    condition     = !contains(keys(module.delete_profile.function.environment[0].variables), "COUNTERS_TABLE")
    error_message = "The delete Lambda must have no COUNTERS_TABLE: it never moves a counter (D-109)."
  }
}

run "get_profile_has_no_counters_table" {
  command = apply

  assert {
    condition     = !contains(keys(module.get_profile.function.environment[0].variables), "COUNTERS_TABLE")
    error_message = "The get profile Lambda must have no COUNTERS_TABLE any more (D-109)."
  }
}
