mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "archive" {}

run "the_checker_is_standard_tier_through_the_eu_profile" {
  command = apply

  assert {
    condition     = one(aws_bedrock_guardrail.text.content_policy_config).tier_config[0].tier_name == "STANDARD"
    error_message = "Hebrew needs the Standard tier: Classic covers only English, French and Spanish (docs/AWS.md)."
  }

  assert {
    condition     = one(aws_bedrock_guardrail.text.cross_region_config).guardrail_profile_identifier == "arn:aws:bedrock:eu-north-1:123456789012:guardrail-profile/${jsondecode(file("${path.module}/../../shared/constants/text-check.json")).guardrail_profile_id}"
    error_message = "Standard tier runs through the guardrail profile named in shared/constants/text-check.json, in this account and Region."
  }
}

run "only_the_five_harm_filters_at_high_strength_and_no_personal_data_filter" {
  command = apply

  assert {
    condition = toset([
      for f in one(aws_bedrock_guardrail.text.content_policy_config).filters_config : f.type
    ]) == toset(["HATE", "INSULTS", "SEXUAL", "VIOLENCE", "MISCONDUCT"])
    error_message = "D-62: hate, insults, sexual content, violence and misconduct; the prompt-attack filter stays off."
  }

  assert {
    condition = alltrue([
      for f in one(aws_bedrock_guardrail.text.content_policy_config).filters_config :
      f.input_strength == "HIGH" && f.input_action == "BLOCK" && f.input_enabled
    ])
    error_message = "D-62: every filter at high strength and blocking: with the action left to AWS's default, a hit might only be reported and the check would never refuse."
  }

  assert {
    condition     = length(aws_bedrock_guardrail.text.sensitive_information_policy_config) == 0
    error_message = "A name is personal data: no personal-data filter (D-62)."
  }
}

run "only_the_current_version_is_kept" {
  command = apply

  assert {
    condition     = aws_bedrock_guardrail_version.text.skip_destroy != true
    error_message = "An old version is deleted when a new one replaces it: AWS limits how many a guardrail can have."
  }
}

run "the_policy_allows_only_apply_guardrail_on_the_guardrail_and_its_profile" {
  command = apply

  assert {
    condition = alltrue([
      for s in jsondecode(aws_iam_policy.text_check.policy).Statement :
      s.Effect == "Allow" && s.Action == "bedrock:ApplyGuardrail"
    ])
    error_message = "The only right is bedrock:ApplyGuardrail: no wildcard action."
  }

  assert {
    condition = (
      contains(jsondecode(aws_iam_policy.text_check.policy).Statement[0].Resource, aws_bedrock_guardrail.text.guardrail_arn) &&
      length(jsondecode(aws_iam_policy.text_check.policy).Statement[0].Resource) == 1 + length(jsondecode(file("${path.module}/../../shared/constants/text-check.json")).profile_regions)
    )
    error_message = "The right names this guardrail and the profile in each Region of it, and nothing else."
  }

  assert {
    condition = alltrue([
      for r in jsondecode(aws_iam_policy.text_check.policy).Statement[0].Resource : !strcontains(r, "*")
    ])
    error_message = "No wildcard in a resource."
  }
}
