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
