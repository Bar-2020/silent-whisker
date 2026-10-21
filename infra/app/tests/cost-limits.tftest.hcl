# The cost-limit pieces against a mock AWS (see infra/README.md).

mock_provider "aws" {
  mock_data "aws_cloudfront_cache_policy" {
    defaults = { id = "658327ea-f89d-4fab-a63d-7e88639e58f6" }
  }

  # A subscription checks the topic ARN's shape, so the mock needs a realistic one.
  mock_resource "aws_sns_topic" {
    defaults = { arn = "arn:aws:sns:eu-north-1:123456789012:silent-whisker-cost-alerts" }
  }
}

run "counters_table_is_free_and_cleans_itself" {
  command = apply

  assert {
    condition = (
      aws_dynamodb_table.daily_counters.billing_mode == "PROVISIONED" &&
      aws_dynamodb_table.daily_counters.read_capacity == 1 &&
      aws_dynamodb_table.daily_counters.write_capacity == 1
    )
    error_message = "Provisioned 1/1 keeps the table in the always-free allowance (D-26)."
  }

  assert {
    condition = (
      one(aws_dynamodb_table.daily_counters.ttl).enabled &&
      one(aws_dynamodb_table.daily_counters.ttl).attribute_name == "expires_at"
    )
    error_message = "Old counter rows must expire on their own through expires_at."
  }
}

run "no_email_subscription_without_an_address" {
  command = apply

  assert {
    condition     = length(aws_sns_topic_subscription.owner_email) == 0
    error_message = "Without ALERT_EMAIL there must be no subscription."
  }
}

run "alerts_are_emailed_when_an_address_is_set" {
  command = apply

  variables {
    alert_email = "owner@example.com"
  }

  assert {
    condition = (
      length(aws_sns_topic_subscription.owner_email) == 1 &&
      aws_sns_topic_subscription.owner_email[0].protocol == "email" &&
      aws_sns_topic_subscription.owner_email[0].topic_arn == aws_sns_topic.cost_alerts.arn
    )
    error_message = "The alert topic must email the owner's address."
  }
}
