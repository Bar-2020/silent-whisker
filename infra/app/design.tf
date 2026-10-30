# The design mocks (design/mocks/) under /design/ on the app's distribution, so they open on a phone
# at the app's own address (D-89). Same pattern as hosting.tf: a private bucket that only CloudFront
# may read; the behavior that serves it is in hosting.tf.

resource "aws_s3_bucket" "design" {
  bucket_prefix = "silent-whisker-design-"
}

resource "aws_s3_bucket_public_access_block" "design" {
  bucket                  = aws_s3_bucket.design.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Kept one second, so a deployed change shows on the phone at once. Not the managed
# Managed-CachingDisabled: it cannot compress, and the four locale files are about 210 KB.
resource "aws_cloudfront_cache_policy" "design" {
  name        = "silent-whisker-design"
  min_ttl     = 0
  default_ttl = 1
  max_ttl     = 1

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true

    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_function" "design_index" {
  name    = "silent-whisker-design-index"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/design-index.js")
}

resource "aws_s3_bucket_policy" "design" {
  bucket = aws_s3_bucket.design.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "CloudFrontReadsDesign"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.design.arn}/*"
        Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.site.arn } }
      },
      {
        Sid       = "HttpsOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.design.arn, "${aws_s3_bucket.design.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.design]
}
