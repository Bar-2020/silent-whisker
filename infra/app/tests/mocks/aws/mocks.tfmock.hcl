# One mock AWS for every test file in infra/app/tests/ (see infra/README.md): the values a real AWS
# would return, where the provider checks their shape or a data source looks something up.

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

mock_resource "aws_iam_role" {
  defaults = { arn = "arn:aws:iam::123456789012:role/silent-whisker-get-profile" }
}

mock_resource "aws_apigatewayv2_api" {
  defaults = {
    api_endpoint  = "https://abc123.execute-api.eu-north-1.amazonaws.com"
    execution_arn = "arn:aws:execute-api:eu-north-1:123456789012:abc123"
  }
}

mock_resource "aws_sns_topic" {
  defaults = { arn = "arn:aws:sns:eu-north-1:123456789012:silent-whisker-cost-alerts" }
}
