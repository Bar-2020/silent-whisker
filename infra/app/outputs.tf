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

# What the app and the API need to talk to Cognito. None of it is secret.
output "auth_domain" {
  description = "Where the app sends people to sign in."
  value       = "https://${aws_cognito_user_pool_domain.members.domain}.auth.${local.constants.selected_region}.amazoncognito.com"
}

output "auth_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "auth_issuer" {
  description = "The address in a sign-in token's `iss` claim; the API's JWT authorizer trusts only it."
  value       = "https://cognito-idp.${local.constants.selected_region}.amazonaws.com/${aws_cognito_user_pool.members.id}"
}
