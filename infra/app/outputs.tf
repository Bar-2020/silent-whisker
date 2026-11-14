# Read by the deploy job (`terraform output -raw ...`) to upload the site and clear the cache.

output "site_url" {
  description = "The app's address."
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "site_bucket" {
  value = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "design_url" {
  description = "The design mocks' address (D-89)."
  value       = "https://${aws_cloudfront_distribution.site.domain_name}/design/"
}

output "design_bucket" {
  value = aws_s3_bucket.design.bucket
}

output "app_client_id" {
  description = "The app's Cognito client id; the deploy checks it against shared/constants/auth.json (D-104)."
  value       = aws_cognito_user_pool_client.web.id
}
