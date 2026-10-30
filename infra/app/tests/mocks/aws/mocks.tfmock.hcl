# One mock AWS for every test file here: real-looking values where the provider checks their shape.

mock_data "aws_cloudfront_cache_policy" {
  defaults = { id = "658327ea-f89d-4fab-a63d-7e88639e58f6" }
}

mock_data "aws_caller_identity" {
  defaults = { account_id = "123456789012" }
}

mock_data "aws_cloudfront_origin_request_policy" {
  defaults = { id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" }
}

mock_resource "aws_cloudfront_function" {
  defaults = { arn = "arn:aws:cloudfront::123456789012:function/silent-whisker-spa-fallback" }
}

mock_resource "aws_iam_policy" {
  defaults = { arn = "arn:aws:iam::123456789012:policy/silent-whisker-use-text-moderation" }
}

mock_resource "aws_iam_role" {
  defaults = { arn = "arn:aws:iam::123456789012:role/silent-whisker-get-profile" }
}

mock_resource "aws_apigatewayv2_api" {
  defaults = {
    api_endpoint  = "https://abc123.execute-api.eu-north-1.amazonaws.com"
    execution_arn = "arn:aws:execute-api:eu-north-1:123456789012:abc123"
  }
}

mock_resource "aws_bedrock_guardrail" {
  defaults = {
    guardrail_arn = "arn:aws:bedrock:eu-north-1:123456789012:guardrail/abc123def456"
    guardrail_id  = "abc123def456"
  }
}

mock_resource "aws_sns_topic" {
  defaults = { arn = "arn:aws:sns:eu-north-1:123456789012:silent-whisker-cost-alerts" }
}
