# `terraform test` runs these against a fake AWS (mock_provider): no account, no cost. Every
# computed value, such as an ARN, gets a made-up string, which is enough to check the wiring.

mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
}

run "deploy_user_can_only_switch_into_the_deployer_role" {
  command = apply

  assert {
    condition     = length(jsondecode(aws_iam_user_policy.deploy.policy).Statement) == 1
    error_message = "The deploy user must have exactly one permission."
  }

  assert {
    condition = (
      jsondecode(aws_iam_user_policy.deploy.policy).Statement[0].Action == "sts:AssumeRole" &&
      jsondecode(aws_iam_user_policy.deploy.policy).Statement[0].Resource == aws_iam_role.deployer.arn
    )
    error_message = "The deploy user may only assume the deployer role."
  }
}

run "only_the_deploy_user_may_switch_into_the_role" {
  command = apply

  assert {
    condition     = jsondecode(aws_iam_role.deployer.assume_role_policy).Statement[0].Principal.AWS == aws_iam_user.deploy.arn
    error_message = "The deployer role must trust only the deploy user."
  }
}

run "deployer_cannot_change_itself_or_delete_the_state" {
  command = apply

  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_role_policy.deployer_lock.policy).Statement :
      s.Effect == "Deny" && s.Action == "iam:*" &&
      toset(s.Resource) == toset([aws_iam_user.deploy.arn, aws_iam_role.deployer.arn])
    ])
    error_message = "The lock must deny every IAM change to the deploy user and role."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_role_policy.deployer_lock.policy).Statement :
      s.Effect == "Deny" && contains(s.Action, "s3:DeleteBucket") &&
      s.Resource == "arn:aws:s3:::silent-whisker-tfstate-123456789012"
    ])
    error_message = "The lock must protect the state bucket."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_role_policy.deployer_lock.policy).Statement :
      s.Effect == "Deny" && contains(s.Action, "s3:PutObject") &&
      s.Resource == "arn:aws:s3:::silent-whisker-tfstate-123456789012/bootstrap.tfstate*"
    ])
    error_message = "The lock must stop deploys rewriting the bootstrap state."
  }
}
