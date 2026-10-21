# The cost limits (D-51): the day's counters, and the email that goes out when the global circuit
# breaker trips. The logic lives in functions/shared/metered-call.ts.

# One row per limit per UTC day (DATA.md). Provisioned 1 read and 1 write unit: inside the
# always-free allowance, which on-demand tables do not get (D-26).
resource "aws_dynamodb_table" "daily_counters" {
  name           = "daily_counters"
  billing_mode   = "PROVISIONED"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "key"

  attribute {
    name = "key"
    type = "S"
  }

  # DynamoDB deletes a row some time after `expires_at` (epoch seconds), free of charge.
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
}

# The breaker's alarm bell: the first trip of a day publishes here (D-51).
resource "aws_sns_topic" "cost_alerts" {
  name = "silent-whisker-cost-alerts"
}

# Where the alarm goes. The address is a GitHub secret, never committed (the repository is
# public). AWS emails it a link to confirm the subscription once. Until the secret is set, there
# is simply no subscription.
variable "alert_email" {
  description = "Where cost alerts are emailed (GitHub secret ALERT_EMAIL)."
  type        = string
  default     = ""
  sensitive   = true
}

resource "aws_sns_topic_subscription" "owner_email" {
  count     = nonsensitive(var.alert_email) == "" ? 0 : 1
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
