# The app's files: a private S3 bucket that only CloudFront may read, on CloudFront's default
# `*.cloudfront.net` address (D-36). The deploy job uploads `dist/` after `terraform apply`.
# No WAF for now (untested whether the project allows it, D-38), so files have no per-IP limit.

# Build output only: every deploy rewrites it from git, so it has no versioning.
resource "aws_s3_bucket" "site" {
  bucket_prefix = "silent-whisker-site-"
}

# Nobody reaches the bucket directly, whatever a later policy or ACL says.
resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Origin Access Control: CloudFront signs each request to the bucket, so the bucket policy below
# can tell this distribution from anyone else.
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "silent-whisker-site"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# One of AWS's ready-made cache settings; `data` looks it up instead of creating anything.
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  default_root_object = "index.html"
  # The cheapest class beyond the free allowance; it still includes Israel and Europe.
  price_class = "PriceClass_100"

  origin {
    origin_id                = "site"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # The free `*.cloudfront.net` certificate; a custom domain comes before launch (D-36).
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Who may read the bucket: only this distribution, and only over HTTPS.
resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "CloudFrontReadsSite"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.site.arn}/*"
        Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.site.arn } }
      },
      {
        Sid       = "HttpsOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.site.arn, "${aws_s3_bucket.site.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
    ]
  })

  # The public access block must exist first, or AWS may briefly judge this policy on its own.
  depends_on = [aws_s3_bucket_public_access_block.site]
}
