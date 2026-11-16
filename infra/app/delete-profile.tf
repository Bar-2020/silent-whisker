# DELETE /api/profile (backend/delete-profile/, D-109): erases the member's personal data on their
# row and marks it deleted, then disables (never deletes) their Cognito sign-in, so the same Google
# account can never sign in or up again. Its role has no PutItem and no DeleteItem.

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
    # IAM cannot narrow this to one member: the handler passes only the signed token's username.
    {
      Effect   = "Allow"
      Action   = "cognito-idp:AdminDisableUser"
      Resource = aws_cognito_user_pool.members.arn
    },
  ]
}
