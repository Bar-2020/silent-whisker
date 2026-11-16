# DELETE /api/profile (backend/delete-profile/, D-109, D-112): erases the member's personal data on
# their row and marks it deleted, then deletes their Cognito sign-in (an active member can sign up
# again) or only disables it (a banned member stays blocked). Its role has no PutItem and no DeleteItem.

module "delete_profile" {
  source             = "./modules/lambda"
  name               = "delete-profile"
  built_dir          = "${path.module}/../../backend/dist/delete-profile"
  memory_mb          = local.api.lambda.memory_mb
  timeout_seconds    = local.api.lambda.timeout_seconds
  log_retention_days = local.api.lambda.log_retention_days
  policy_name        = "account-delete"

  environment = {
    USERS_TABLE  = aws_dynamodb_table.users.name
    USER_POOL_ID = aws_cognito_user_pool.members.id
  }

  policy_statements = [
    {
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
      Resource = aws_dynamodb_table.users.arn
    },
    # IAM cannot narrow these to one member: the handler passes only the signed token's username (D-112).
    {
      Effect   = "Allow"
      Action   = ["cognito-idp:AdminDeleteUser", "cognito-idp:AdminDisableUser"]
      Resource = aws_cognito_user_pool.members.arn
    },
  ]
}
