# PATCH /api/profile (backend/update-profile/): checks the name and city on the spot (D-62), so its
# role also reaches the geocoder cache, the daily counters, the cost alert topic and the text
# moderation guardrail. A longer timeout than the others: a geocoder slot and two outside calls.

data "archive_file" "update_profile" {
  type        = "zip"
  source_dir  = "${path.module}/../../backend/dist/update-profile"
  output_path = "${path.module}/../../backend/dist/update-profile.zip"
}

resource "aws_cloudwatch_log_group" "update_profile" {
  name              = "/aws/lambda/update-profile"
  retention_in_days = local.api.lambda.log_retention_days
}

resource "aws_iam_role" "update_profile" {
  name = "silent-whisker-update-profile"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# The row is made by GET /profile, so this role cannot create one; nothing here deletes.
resource "aws_iam_role_policy" "update_profile" {
  name = "profile-save"
  role = aws_iam_role.update_profile.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
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
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.update_profile.arn}:*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "update_profile_text_moderation" {
  role       = aws_iam_role.update_profile.name
  policy_arn = aws_iam_policy.text_moderation.arn
}

resource "aws_lambda_function" "update_profile" {
  function_name    = "update-profile"
  role             = aws_iam_role.update_profile.arn
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  handler          = "handler.handler"
  filename         = data.archive_file.update_profile.output_path
  source_code_hash = data.archive_file.update_profile.output_base64sha256
  memory_size      = local.api.lambda.memory_mb
  timeout          = local.api.update_profile.timeout_seconds

  environment {
    variables = {
      USERS_TABLE       = aws_dynamodb_table.users.name
      GEOCODE_TABLE     = aws_dynamodb_table.geocode_cache.name
      COUNTERS_TABLE    = aws_dynamodb_table.daily_usage_counters.name
      ALERT_TOPIC_ARN   = aws_sns_topic.cost_alerts.arn
      GUARDRAIL_ID      = aws_bedrock_guardrail.text_moderation.guardrail_id
      GUARDRAIL_VERSION = aws_bedrock_guardrail_version.text_moderation.version
    }
  }

  depends_on = [aws_cloudwatch_log_group.update_profile]
}
