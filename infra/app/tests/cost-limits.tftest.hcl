mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "archive" {}

run "counters_table_is_free_and_cleans_itself" {
  command = apply

  assert {
    condition = (
      aws_dynamodb_table.daily_usage_counters.billing_mode == "PROVISIONED" &&
      aws_dynamodb_table.daily_usage_counters.read_capacity == 1 &&
      aws_dynamodb_table.daily_usage_counters.write_capacity == 3
    )
    error_message = "Provisioned 1 read and 3 write units, from shared/constants/capacity.json (D-26)."
  }

  assert {
    condition     = aws_dynamodb_table.daily_usage_counters.deletion_protection_enabled
    error_message = "Every table has delete protection on (D-77)."
  }

  assert {
    condition = (
      one(aws_dynamodb_table.daily_usage_counters.ttl).enabled &&
      one(aws_dynamodb_table.daily_usage_counters.ttl).attribute_name == "expires_at"
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
