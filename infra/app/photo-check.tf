# What the photo check may call (D-09, D-50): one Bedrock model, through the EU inference profile.
# A profile is Bedrock's name for "this model, run in any Region of a group". Calling it needs two
# rights: one on the profile, and one on the model itself in each Region the profile can send the
# call to (those Regions change over time, hence the `*`). The second right only applies when the
# call comes through this profile, so the policy can never invoke the model directly.
#
# Switching to Claude Haiku 4.5 (D-50) is a change of the constant, but that model is billed through
# AWS Marketplace, so the role may also need `aws-marketplace:ViewSubscriptions` and
# `aws-marketplace:Subscribe` for its first call. Check AWS's Bedrock docs and add them then.
#
# Nothing attaches the policy yet: the first Lambda that checks photos (phase 3) attaches it to its
# own role. Calls go through `meteredCall` (R-05), which this policy does not replace.

data "aws_caller_identity" "current" {}

locals {
  photo_check_profile_id = jsondecode(file("${path.module}/../../shared/constants/photo-check.json")).model_id
  # "eu.amazon.nova-lite-v1:0" is the profile; "amazon.nova-lite-v1:0" is the model behind it.
  photo_check_model_id    = trimprefix(local.photo_check_profile_id, "eu.")
  photo_check_profile_arn = "arn:aws:bedrock:${local.constants.selected_region}:${data.aws_caller_identity.current.account_id}:inference-profile/${local.photo_check_profile_id}"
}

resource "aws_iam_policy" "photo_check" {
  name        = "silent-whisker-photo-check"
  description = "Lets the photo check call its Bedrock model through the EU inference profile, and nothing else."

  lifecycle {
    # The model ID below is cut from the profile ID by dropping "eu."; any other prefix would give
    # a model that does not exist, and every photo check would be refused.
    precondition {
      condition     = startswith(local.photo_check_profile_id, "eu.")
      error_message = "shared/constants/photo-check.json model_id must be an EU inference profile (eu....)."
    }
  }

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # The Converse API is authorised by this one action.
        Sid      = "CallTheProfile"
        Effect   = "Allow"
        Action   = "bedrock:InvokeModel"
        Resource = local.photo_check_profile_arn
      },
      {
        Sid      = "ModelBehindTheProfile"
        Effect   = "Allow"
        Action   = "bedrock:InvokeModel"
        Resource = "arn:aws:bedrock:*::foundation-model/${local.photo_check_model_id}"
        Condition = {
          StringEquals = { "bedrock:InferenceProfileArn" = local.photo_check_profile_arn }
        }
      },
    ]
  })
}
