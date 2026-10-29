# The cost limits (D-52): the day's counters, and the email that goes out when the global circuit
# breaker trips. The logic lives in backend/shared/metered-call.ts.

locals {
  # Capacity units, shared with DATA.md's budget of the 25 free units (shared/constants/).
  capacity = jsondecode(file("${path.module}/../../shared/constants/capacity.json"))
}

# One row per limit per UTC day (DATA.md). Provisioned, inside the always-free allowance, which
# on-demand tables do not get (D-26). Every paid call and every member write hits this table, so
# it gets more write units than the 1 a table needs at least: each unit is about one write a second.
resource "aws_dynamodb_table" "daily_usage_counters" {
  name           = "daily_usage_counters"
  billing_mode   = "PROVISIONED"
  read_capacity  = local.capacity.daily_usage_counters.read
  write_capacity = local.capacity.daily_usage_counters.write
  hash_key       = "key"

  # A mistaken `terraform destroy` or a replacement cannot drop the table; free, and on every table (D-73).
  deletion_protection_enabled = true

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

# The breaker's alarm bell: the first trip of a day publishes here (D-52).
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
