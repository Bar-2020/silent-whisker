output "function" {
  description = "The Lambda function, for the API route that starts it."
  value       = aws_lambda_function.this
}

output "role_policy" {
  description = "The role's own policy, so a test can read its statements."
  value       = aws_iam_role_policy.this
}

output "attachments" {
  description = "The extra policies attached to the role."
  value       = aws_iam_role_policy_attachment.extra
}
