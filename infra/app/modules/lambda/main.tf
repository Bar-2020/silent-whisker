# One Lambda handler: its zip, its log group and its role. A handler that has not been built fails
# the plan, so every deploy builds first. The role's own rights come in as `policy_statements`.

terraform {
  required_providers {
    archive = {
      source = "hashicorp/archive"
    }
    aws = {
      source = "hashicorp/aws"
    }
  }
}

data "archive_file" "this" {
  type        = "zip"
  source_dir  = var.built_dir
  output_path = "${var.built_dir}.zip"
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.name}"
  retention_in_days = var.log_retention_days
}

resource "aws_iam_role" "this" {
  name = "silent-whisker-${var.name}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "this" {
  name = var.policy_name
  role = aws_iam_role.this.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(var.policy_statements, [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.this.arn}:*"
    }])
  })
}

# `count`, not `for_each`: a policy made in the same apply has no ARN yet, but the list has a length.
resource "aws_iam_role_policy_attachment" "extra" {
  count      = length(var.policy_arns)
  role       = aws_iam_role.this.name
  policy_arn = var.policy_arns[count.index]
}

resource "aws_lambda_function" "this" {
  function_name    = var.name
  role             = aws_iam_role.this.arn
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  handler          = "handler.handler"
  filename         = data.archive_file.this.output_path
  source_code_hash = data.archive_file.this.output_base64sha256
  memory_size      = var.memory_mb
  timeout          = var.timeout_seconds

  environment {
    variables = var.environment
  }

  # Lambda would otherwise make the log group itself, with no expiry.
  depends_on = [aws_cloudwatch_log_group.this]
}
