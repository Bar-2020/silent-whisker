# The text check for everything members write (D-09, R-04): a Bedrock Guardrail, Standard tier,
# which Hebrew needs, so it always runs through the EU guardrail profile (docs/AWS.md). Called
# through `meteredCall` (R-05); `PATCH /profile` is the first user (D-62). A feature that needs
# other filters gets a guardrail of its own. The hand-made test guardrail is not reused.

locals {
  text_check = jsondecode(file("${path.module}/../../shared/constants/text-check.json"))

  # The provider wants the profile as an ARN, in the selected Region.
  text_check_profile_arn = "arn:aws:bedrock:${local.constants.selected_region}:${data.aws_caller_identity.current.account_id}:guardrail-profile/${local.text_check.guardrail_profile_id}"
}

resource "aws_bedrock_guardrail" "text" {
  name                      = "silent-whisker-text"
  description               = "Checks text that members write (D-09, D-62)."
  blocked_input_messaging   = "blocked"
  blocked_outputs_messaging = "blocked"

  content_policy_config {
    tier_config {
      tier_name = "STANDARD"
    }

    # No prompt-attack filter and no personal-data filter: a name is personal data (D-62).
    dynamic "filters_config" {
      for_each = ["HATE", "INSULTS", "SEXUAL", "VIOLENCE", "MISCONDUCT"]
      content {
        type            = filters_config.value
        input_strength  = "HIGH"
        input_action    = "BLOCK"
        input_enabled   = true
        output_strength = "HIGH"
        output_action   = "BLOCK"
        output_enabled  = true
      }
    }
  }

  cross_region_config {
    guardrail_profile_identifier = local.text_check_profile_arn
  }
}

# A numbered version, so editing the draft never changes what the app calls. A changed guardrail
# gets a new version and the old one is deleted, so only the current one exists.
resource "aws_bedrock_guardrail_version" "text" {
  guardrail_arn = aws_bedrock_guardrail.text.guardrail_arn
  description   = "Used by the text checks."

  lifecycle {
    replace_triggered_by = [aws_bedrock_guardrail.text]
  }
}

# Nothing attaches it yet: each Lambda that checks text attaches it to its own role. Calling a
# cross-Region guardrail needs the guardrail and its profile in every Region of the profile.
resource "aws_iam_policy" "text_check" {
  name        = "silent-whisker-text-check"
  description = "Lets a text check apply the text guardrail, and nothing else."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "bedrock:ApplyGuardrail"
      Resource = concat(
        [aws_bedrock_guardrail.text.guardrail_arn],
        [
          for region in local.text_check.profile_regions :
          "arn:aws:bedrock:${region}:${data.aws_caller_identity.current.account_id}:guardrail-profile/${local.text_check.guardrail_profile_id}"
        ]
      )
    }]
  })
}
