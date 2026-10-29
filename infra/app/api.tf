# The API (D-38, D-60): routes and their throttles are in shared/constants/api.json.

locals {
  api = jsondecode(file("${path.module}/../../shared/constants/api.json"))

  # A new route goes here and in api.json; a test fails if it lacks the authorizer or a throttle.
  route_functions = {
    "GET /api/profile" = aws_lambda_function.get_profile
  }
}

# Provisioned, inside the always-free units (D-26).
resource "aws_dynamodb_table" "users" {
  name                        = "users"
  billing_mode                = "PROVISIONED"
  read_capacity               = local.capacity.users.read
  write_capacity              = local.capacity.users.write
  hash_key                    = "user_id"
  deletion_protection_enabled = true

  attribute {
    name = "user_id"
    type = "S"
  }
}

# A handler that has not been built fails the plan, so every deploy builds first.
data "archive_file" "get_profile" {
  type        = "zip"
  source_dir  = "${path.module}/../../backend/dist/get-profile"
  output_path = "${path.module}/../../backend/dist/get-profile.zip"
}

resource "aws_cloudwatch_log_group" "get_profile" {
  name              = "/aws/lambda/get-profile"
  retention_in_days = local.api.lambda.log_retention_days
}

resource "aws_iam_role" "get_profile" {
  name = "silent-whisker-get-profile"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "get_profile" {
  name = "users-and-logs"
  role = aws_iam_role.get_profile.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
        Resource = aws_dynamodb_table.users.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.get_profile.arn}:*"
      },
    ]
  })
}

resource "aws_lambda_function" "get_profile" {
  function_name    = "get-profile"
  role             = aws_iam_role.get_profile.arn
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  handler          = "handler.handler"
  filename         = data.archive_file.get_profile.output_path
  source_code_hash = data.archive_file.get_profile.output_base64sha256
  memory_size      = local.api.lambda.memory_mb
  timeout          = local.api.lambda.timeout_seconds

  environment {
    variables = {
      USERS_TABLE = aws_dynamodb_table.users.name
    }
  }

  # Lambda would otherwise make the log group itself, with no expiry.
  depends_on = [aws_cloudwatch_log_group.get_profile]
}

resource "aws_apigatewayv2_api" "api" {
  name          = "silent-whisker-api"
  protocol_type = "HTTP"
}

# It also accepts access tokens, so the handlers insist on the ID token themselves (D-59).
resource "aws_apigatewayv2_authorizer" "members" {
  api_id           = aws_apigatewayv2_api.api.id
  name             = "cognito-members"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.web.id]
    issuer   = "https://${aws_cognito_user_pool.members.endpoint}"
  }
}

resource "aws_apigatewayv2_integration" "route" {
  for_each = local.route_functions

  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = each.value.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "route" {
  for_each = local.route_functions

  api_id             = aws_apigatewayv2_api.api.id
  route_key          = each.key
  target             = "integrations/${aws_apigatewayv2_integration.route[each.key].id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.members.id
}

resource "aws_lambda_permission" "route" {
  for_each = local.route_functions

  statement_id  = "InvokedByTheApi-${substr(sha256(each.key), 0, 8)}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/${replace(each.key, " ", "")}"
}

# The front door's own limit per route (R-21); it answers a bare 429 (D-60).
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  dynamic "route_settings" {
    for_each = local.api.routes
    content {
      route_key              = route_settings.key
      throttling_rate_limit  = route_settings.value.rate_per_second
      throttling_burst_limit = route_settings.value.burst
    }
  }

  # A route's settings need the route to exist first.
  depends_on = [aws_apigatewayv2_route.route]
}
