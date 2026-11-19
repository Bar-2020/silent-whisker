# The city list job (backend/update-cities/, D-117): on the 1st of every month, 03:00 UTC, it reads
# the government's list of places and replaces the `cities/` files of the site's bucket, if the new
# list passes its checks. A failed run leaves the list on the site as it was and emails the owner.
# The manual `npm run cities:upload` stays for the first upload and as a backup.

module "update_cities" {
  source             = "./modules/lambda"
  name               = "update-cities"
  built_dir          = "${path.module}/../../backend/dist/update-cities"
  memory_mb          = local.api.lambda.memory_mb
  timeout_seconds    = local.api.update_cities.timeout_seconds
  log_retention_days = local.api.lambda.log_retention_days
  policy_name        = "city-list-update"

  environment = {
    SITE_BUCKET = aws_s3_bucket.site.bucket
  }

  # Read the list now on the site (the bucket listing makes a missing file an answer, not an access
  # error, so the first run knows there is none); write only the city files.
  policy_statements = [
    {
      Effect   = "Allow"
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.site.arn}/cities/en.json"
    },
    {
      Effect   = "Allow"
      Action   = "s3:ListBucket"
      Resource = aws_s3_bucket.site.arn
    },
    {
      Effect   = "Allow"
      Action   = "s3:PutObject"
      Resource = "${aws_s3_bucket.site.arn}/cities/*"
    },
  ]
}

resource "aws_iam_role" "city_list_schedule" {
  name = "silent-whisker-city-list-schedule"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "city_list_schedule" {
  name = "start-the-city-list-job"
  role = aws_iam_role.city_list_schedule.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = module.update_cities.function.arn
    }]
  })
}

resource "aws_scheduler_schedule" "city_list" {
  name                = "silent-whisker-city-list-monthly"
  schedule_expression = local.api.update_cities.schedule

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = module.update_cities.function.arn
    role_arn = aws_iam_role.city_list_schedule.arn
  }
}

# One failed run in a day emails the owner through the alert topic (D-52). No data is a good day.
resource "aws_cloudwatch_metric_alarm" "city_list_update_failed" {
  alarm_name          = "silent-whisker-city-list-update-failed"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = module.update_cities.function.function_name }
  statistic           = "Sum"
  period              = 86400
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]
}
