# The photo check's Bedrock permission against a mock AWS (see infra/README.md).

mock_provider "aws" {
  mock_data "aws_cloudfront_cache_policy" {
    defaults = { id = "658327ea-f89d-4fab-a63d-7e88639e58f6" }
  }

  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
}

run "may_only_invoke_the_model_named_in_the_constants_file" {
  command = apply

  assert {
    condition = alltrue([
      for s in jsondecode(aws_iam_policy.photo_check.policy).Statement : s.Effect == "Allow" && s.Action == "bedrock:InvokeModel"
    ])
    error_message = "The only right is bedrock:InvokeModel: no wildcard action, no other Bedrock call."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_policy.photo_check.policy).Statement :
      s.Resource == "arn:aws:bedrock:eu-north-1:123456789012:inference-profile/eu.amazon.nova-lite-v1:0"
    ])
    error_message = "The profile right must name the EU Nova Lite profile in this account and Region."
  }
}

run "the_model_is_reachable_only_through_the_profile" {
  command = apply

  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_policy.photo_check.policy).Statement :
      s.Resource == "arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0" &&
      s.Condition.StringEquals["bedrock:InferenceProfileArn"] == "arn:aws:bedrock:eu-north-1:123456789012:inference-profile/eu.amazon.nova-lite-v1:0"
    ])
    error_message = "The model right must carry the condition that the call comes through the profile."
  }
}
