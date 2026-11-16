# DELETE /api/profile (backend/delete-profile/, D-109): deletes the member's row and Cognito sign-in,
# or for a banned member keeps the ban (the row is reduced to `user_id` and `status`, the sign-in
# is disabled). Its role cannot make a row: no PutItem on `users`.

module "delete_profile" {
  source             = "./modules/lambda"
  name               = "delete-profile"
  built_dir          = "${path.module}/../../backend/dist/delete-profile"
  memory_mb          = local.api.lambda.memory_mb
  timeout_seconds    = local.api.lambda.timeout_seconds
  log_retention_days = local.api.lambda.log_retention_days
  policy_name        = "account-delete"

  environment = {
    USERS_TABLE    = aws_dynamodb_table.users.name
    COUNTERS_TABLE = aws_dynamodb_table.daily_usage_counters.name
    USER_POOL_ID   = aws_cognito_user_pool.members.id
  }

  policy_statements = [
    {
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"]
      Resource = aws_dynamodb_table.users.arn
    },
    # The write limit's counter and the marker of a deleted account.
    {
      Effect   = "Allow"
      Action   = "dynamodb:UpdateItem"
      Resource = aws_dynamodb_table.daily_usage_counters.arn
    },
    # IAM cannot narrow these to one member: the handler passes only the signed token's username.
    {
      Effect   = "Allow"
      Action   = ["cognito-idp:AdminDeleteUser", "cognito-idp:AdminDisableUser"]
      Resource = aws_cognito_user_pool.members.arn
    },
  ]
}
