# PATCH /api/profile (backend/update-profile/): checks the name and city on the spot (D-62), so its
# role also reaches the geocoder cache, the daily counters, the cost alert topic and the text
# moderation guardrail. A longer timeout than the others: a geocoder slot and two outside calls.

module "update_profile" {
  source             = "./modules/lambda"
  name               = "update-profile"
  built_dir          = "${path.module}/../../backend/dist/update-profile"
  memory_mb          = local.api.lambda.memory_mb
  timeout_seconds    = local.api.update_profile.timeout_seconds
  log_retention_days = local.api.lambda.log_retention_days
  policy_name        = "profile-save"
  policy_arns        = [aws_iam_policy.text_moderation.arn]

  environment = {
    USERS_TABLE       = aws_dynamodb_table.users.name
    GEOCODE_TABLE     = aws_dynamodb_table.geocode_cache.name
    COUNTERS_TABLE    = aws_dynamodb_table.daily_usage_counters.name
    ALERT_TOPIC_ARN   = aws_sns_topic.cost_alerts.arn
    GUARDRAIL_ID      = aws_bedrock_guardrail.text_moderation.guardrail_id
    GUARDRAIL_VERSION = aws_bedrock_guardrail_version.text_moderation.version
  }

  # The row is made by GET /profile, so this role cannot create one; nothing here deletes.
  policy_statements = [
    {
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
      Resource = aws_dynamodb_table.users.arn
    },
    {
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem", "dynamodb:PutItem"]
      Resource = aws_dynamodb_table.geocode_cache.arn
    },
    {
      Effect   = "Allow"
      Action   = ["dynamodb:UpdateItem", "dynamodb:PutItem"]
      Resource = aws_dynamodb_table.daily_usage_counters.arn
    },
    {
      Effect   = "Allow"
      Action   = "sns:Publish"
      Resource = aws_sns_topic.cost_alerts.arn
    },
  ]
}
