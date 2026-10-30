mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "archive" {}

run "design_bucket_is_private_and_only_the_design_cloudfront_reads_it" {
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
      s.Condition.StringEquals["AWS:SourceArn"] == aws_cloudfront_distribution.design.arn
    ])
    error_message = "The design bucket must let only the design distribution read it."
  }

  assert {
    condition = anytrue([
      for s in jsondecode(aws_s3_bucket_policy.design.policy).Statement :
      s.Effect == "Deny" && s.Condition.Bool["aws:SecureTransport"] == "false"
    ])
    error_message = "The design bucket must refuse anything but HTTPS."
  }
}

run "design_is_its_own_address_over_https_compressed_and_barely_cached" {
  command = apply

  assert {
    condition     = aws_cloudfront_distribution.design.id != aws_cloudfront_distribution.site.id
    error_message = "The mocks must have a distribution of their own (D-89)."
  }

  assert {
    condition     = one(aws_cloudfront_distribution.design.default_cache_behavior).viewer_protocol_policy == "redirect-to-https"
    error_message = "Plain HTTP must redirect to HTTPS."
  }

  assert {
    condition     = aws_cloudfront_distribution.design.default_root_object == "index.html"
    error_message = "The root must serve index.html, or the phone link shows an S3 error."
  }

  assert {
    condition     = one(aws_cloudfront_distribution.design.default_cache_behavior).cache_policy_id == aws_cloudfront_cache_policy.design.id && aws_cloudfront_cache_policy.design.max_ttl <= 1
    error_message = "A deployed mock must show on the phone at once, so it is cached for a second at most."
  }

  assert {
    condition = alltrue([
      one(aws_cloudfront_distribution.design.default_cache_behavior).compress,
      one(aws_cloudfront_cache_policy.design.parameters_in_cache_key_and_forwarded_to_origin).enable_accept_encoding_gzip,
      one(aws_cloudfront_cache_policy.design.parameters_in_cache_key_and_forwarded_to_origin).enable_accept_encoding_brotli,
    ])
    error_message = "The mocks must be compressed: the locale files are about 210 KB."
  }

  assert {
    condition     = length(aws_cloudfront_distribution.design.ordered_cache_behavior) == 0 && length(one(aws_cloudfront_distribution.design.default_cache_behavior).function_association) == 0
    error_message = "The design address serves files only: no API and no page fallback."
  }
}
