# The app's files: a private S3 bucket that only CloudFront may read, on CloudFront's default
# `*.cloudfront.net` address (D-36). The deploy job uploads `frontend/dist/` after `terraform apply`.
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

# For /api/*: nothing is cached (every answer is about one member), and every header but Host,
# `Authorization` included, goes to the API, whose Host header must be its own.
data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

# The app draws its own pages in the browser (/profile, /auth/callback), but the bucket holds one
# page, index.html, and for an address with no file S3 answers "Access Denied". This function
# serves index.html for those addresses (D-63). It is attached to the files only, never to /api.
resource "aws_cloudfront_function" "spa_fallback" {
  name    = "silent-whisker-spa-fallback"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/spa-fallback.js")
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

  # The API (api.tf), reached over HTTPS at its own address, without the `https://`.
  origin {
    origin_id   = "api"
    domain_name = replace(aws_apigatewayv2_api.api.api_endpoint, "https://", "")

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Everything under /api/ goes to the API, with the page fallback kept away from it (D-63). The
  # pattern `/api/*` does not match a bare `/api`, so that has its own, or it would get the web page.
  dynamic "ordered_cache_behavior" {
    for_each = ["/api", "/api/*"]

    content {
      path_pattern             = ordered_cache_behavior.value
      target_origin_id         = "api"
      viewer_protocol_policy   = "redirect-to-https"
      allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods           = ["GET", "HEAD"]
      cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    }
  }

  default_cache_behavior {
    target_origin_id       = "site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_fallback.arn
    }
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
