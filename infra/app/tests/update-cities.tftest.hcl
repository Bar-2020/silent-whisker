mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "archive" {}

# INFRA-12, D-117: the monthly city list job.

run "the_job_runs_monthly_through_its_own_role" {
  command = apply

  assert {
    condition     = aws_scheduler_schedule.city_list.schedule_expression == "cron(0 3 1 * ? *)"
    error_message = "The city list job runs on the 1st of every month at 03:00 UTC (shared/constants/api.json)."
  }

  assert {
    condition     = aws_scheduler_schedule.city_list.flexible_time_window[0].mode == "OFF"
    error_message = "No flexible window: the job starts at the set time."
  }

  assert {
    condition     = aws_scheduler_schedule.city_list.target[0].arn == module.update_cities.function.arn
    error_message = "The schedule starts the city list function."
  }

  assert {
    condition = alltrue([
      for s in jsondecode(aws_iam_role_policy.city_list_schedule.policy).Statement :
      toset(flatten([s.Action])) == toset(["lambda:InvokeFunction"]) &&
      flatten([s.Resource]) == [module.update_cities.function.arn]
    ])
    error_message = "The schedule's role may only invoke the city list function."
  }
}

run "the_job_may_only_read_the_list_and_write_the_city_files" {
  command = apply

  assert {
    condition = anytrue([
      for s in jsondecode(module.update_cities.role_policy.policy).Statement :
      flatten([s.Resource]) == ["${aws_s3_bucket.site.arn}/cities/en.json"] &&
      toset(flatten([s.Action])) == toset(["s3:GetObject"])
    ])
    error_message = "The job reads the list now on the site: the object cities/en.json only."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(module.update_cities.role_policy.policy).Statement :
      flatten([s.Resource]) == [aws_s3_bucket.site.arn] &&
      toset(flatten([s.Action])) == toset(["s3:ListBucket"])
    ])
    error_message = "ListBucket on the site's bucket, so a missing list is an answer and not an access error."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(module.update_cities.role_policy.policy).Statement :
      flatten([s.Resource]) == ["${aws_s3_bucket.site.arn}/cities/*"] &&
      toset(flatten([s.Action])) == toset(["s3:PutObject"])
    ])
    error_message = "The job writes only the cities/ folder of the site's bucket."
  }

  assert {
    condition = alltrue([
      for s in jsondecode(module.update_cities.role_policy.policy).Statement : alltrue([
        for a in flatten([s.Action]) :
        !startswith(a, "s3:Delete") && !endswith(a, "*") && !startswith(a, "dynamodb:")
      ])
    ])
    error_message = "The city list job deletes nothing and has no wildcard action or table."
  }

  assert {
    condition     = module.update_cities.function.environment[0].variables["SITE_BUCKET"] == aws_s3_bucket.site.bucket
    error_message = "The handler reads the site's bucket from SITE_BUCKET."
  }
}

run "a_failed_run_emails_the_owner" {
  command = apply

  assert {
    condition = (
      aws_cloudwatch_metric_alarm.city_list_update_failed.namespace == "AWS/Lambda" &&
      aws_cloudwatch_metric_alarm.city_list_update_failed.metric_name == "Errors" &&
      aws_cloudwatch_metric_alarm.city_list_update_failed.threshold == 1 &&
      aws_cloudwatch_metric_alarm.city_list_update_failed.comparison_operator == "GreaterThanOrEqualToThreshold" &&
      aws_cloudwatch_metric_alarm.city_list_update_failed.treat_missing_data == "notBreaching"
    )
    error_message = "One error of the city list function in a day is an alarm; a day without data is not."
  }

  assert {
    condition     = contains(aws_cloudwatch_metric_alarm.city_list_update_failed.alarm_actions, aws_sns_topic.cost_alerts.arn)
    error_message = "The alarm publishes to the alert topic the owner's email is subscribed to."
  }
}
