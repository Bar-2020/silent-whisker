mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "archive" {}

# The mock gives every CloudFront Function one ARN; telling the two apart needs one of their own.
override_resource {
  target = aws_cloudfront_function.design_index
  values = { arn = "arn:aws:cloudfront::123456789012:function/silent-whisker-design-index" }
}

run "design_bucket_is_private_and_only_the_apps_cloudfront_reads_it" {
  command = apply

  assert {
    condition = alltrue([
      aws_s3_bucket_public_access_block.design.block_public_acls,
      aws_s3_bucket_public_access_block.design.block_public_policy,
      aws_s3_bucket_public_access_block.design.ignore_public_acls,
      aws_s3_bucket_public_access_block.design.restrict_public_buckets,
    ])
    error_message = "Every public access setting must be blocked."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(aws_s3_bucket_policy.design.policy).Statement :
      s.Effect == "Allow" && s.Principal == { Service = "cloudfront.amazonaws.com" } &&
      s.Condition.StringEquals["AWS:SourceArn"] == aws_cloudfront_distribution.site.arn
    ])
    error_message = "The design bucket must let only the app's distribution read it."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(aws_s3_bucket_policy.design.policy).Statement :
      s.Effect == "Deny" && s.Condition.Bool["aws:SecureTransport"] == "false"
    ])
    error_message = "The design bucket must refuse anything but HTTPS."
  }
}

run "design_is_served_under_slash_design_over_https_compressed_and_barely_cached" {
  command = apply

  assert {
    condition = alltrue([
      for p in ["/design", "/design/*"] : anytrue([
        for b in aws_cloudfront_distribution.site.ordered_cache_behavior :
        b.path_pattern == p &&
        b.target_origin_id == "design" &&
        b.viewer_protocol_policy == "redirect-to-https" &&
        b.compress &&
        b.cache_policy_id == aws_cloudfront_cache_policy.design.id &&
        anytrue([
          for f in b.function_association :
          f.event_type == "viewer-request" && f.function_arn == aws_cloudfront_function.design_index.arn
        ])
      ])
    ])
    error_message = "Both /design and /design/* must reach the design bucket over HTTPS, compressed, with the index function (D-89)."
  }

  assert {
    condition     = aws_cloudfront_cache_policy.design.max_ttl <= 1
    error_message = "A deployed mock must show on the phone at once, so it is cached for a second at most."
  }

  assert {
    condition = alltrue([
      one(aws_cloudfront_cache_policy.design.parameters_in_cache_key_and_forwarded_to_origin).enable_accept_encoding_gzip,
      one(aws_cloudfront_cache_policy.design.parameters_in_cache_key_and_forwarded_to_origin).enable_accept_encoding_brotli,
    ])
    error_message = "The mocks must be compressed: the locale files are about 210 KB."
  }

  assert {
    condition = alltrue([
      for o in aws_cloudfront_distribution.site.origin :
      o.origin_id != "design" || o.origin_access_control_id == aws_cloudfront_origin_access_control.site.id
    ])
    error_message = "CloudFront must sign its requests to the design bucket."
  }

  assert {
    condition = alltrue([
      for b in aws_cloudfront_distribution.site.ordered_cache_behavior :
      b.target_origin_id != "design" || alltrue([
        for f in b.function_association : f.function_arn != aws_cloudfront_function.spa_fallback.arn
      ])
    ])
    error_message = "The design behaviors must not carry the app's page fallback: a missing mock would answer with the app."
  }
}
