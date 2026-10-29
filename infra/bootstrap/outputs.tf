# Neither is a secret: they are names, not keys.

output "deploy_user_name" {
  description = "Make this user's access key by hand (infra/README.md)."
  value       = aws_iam_user.deploy.name
}

output "deployer_role_arn" {
  description = "The GitHub repository variable AWS_DEPLOY_ROLE_ARN."
  value       = aws_iam_role.deployer.arn
}
