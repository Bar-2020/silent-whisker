# The hosting setup against a mock AWS: no account, no cost (see infra/README.md).

mock_provider "aws" {
  mock_data "aws_cloudfront_cache_policy" {
    defaults = { id = "658327ea-f89d-4fab-a63d-7e88639e58f6" }
  }

  # The distribution checks the function ARN's shape, so the mock needs a realistic one.
  mock_resource "aws_cloudfront_function" {
    defaults = { arn = "arn:aws:cloudfront::123456789012:function/silent-whisker-spa-fallback" }
  }
}

run "bucket_is_private" {
  command = apply

  assert {
    condition = alltrue([
      aws_s3_bucket_public_access_block.site.block_public_acls,
      aws_s3_bucket_public_access_block.site.block_public_policy,
      aws_s3_bucket_public_access_block.site.ignore_public_acls,
      aws_s3_bucket_public_access_block.site.restrict_public_buckets,
    ])
    error_message = "Every public access setting must be blocked."
  }
}

run "only_this_cloudfront_may_read_and_only_over_https" {
  command = apply

  assert {
    condition = anytrue([
      for s in jsondecode(aws_s3_bucket_policy.site.policy).Statement :
      s.Effect == "Allow" && s.Principal == { Service = "cloudfront.amazonaws.com" } &&
      s.Condition.StringEquals["AWS:SourceArn"] == aws_cloudfront_distribution.site.arn
    ])
    error_message = "The bucket must let only this distribution read it."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(aws_s3_bucket_policy.site.policy).Statement :
      s.Effect == "Deny" && s.Condition.Bool["aws:SecureTransport"] == "false"
    ])
    error_message = "The bucket must refuse anything but HTTPS."
  }

  assert {
    condition     = aws_cloudfront_origin_access_control.site.signing_behavior == "always"
    error_message = "CloudFront must sign every request to the bucket."
  }
}

run "cloudfront_serves_index_over_https_at_the_cheapest_class" {
  command = apply

  assert {
    condition     = aws_cloudfront_distribution.site.default_root_object == "index.html"
    error_message = "The root must serve index.html."
  }

  assert {
    condition     = one(aws_cloudfront_distribution.site.default_cache_behavior).viewer_protocol_policy == "redirect-to-https"
    error_message = "Plain HTTP must redirect to HTTPS."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.price_class == "PriceClass_100"
    error_message = "Price Class 100: cheapest, and still covers Israel."
  }
}

run "pages_without_a_file_serve_the_app" {
  command = apply

  assert {
    condition = anytrue([
      for f in one(aws_cloudfront_distribution.site.default_cache_behavior).function_association :
      f.event_type == "viewer-request" && f.function_arn == aws_cloudfront_function.spa_fallback.arn
    ])
    error_message = "The files' behavior must run the page fallback on every request (D-63), or /auth/callback is Access Denied."
  }

  assert {
    condition     = aws_cloudfront_function.spa_fallback.runtime == "cloudfront-js-2.0" && aws_cloudfront_function.spa_fallback.publish
    error_message = "The fallback must be published and use the current runtime, or CloudFront keeps serving the old code."
  }
}
