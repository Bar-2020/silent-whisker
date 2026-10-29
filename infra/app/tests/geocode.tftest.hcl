mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "archive" {}

run "the_geocode_cache_is_inside_the_free_units" {
  command = apply

  assert {
    condition = (
      aws_dynamodb_table.geocode_cache.billing_mode == "PROVISIONED" &&
      aws_dynamodb_table.geocode_cache.read_capacity == 1 &&
      aws_dynamodb_table.geocode_cache.write_capacity == 1 &&
      aws_dynamodb_table.geocode_cache.hash_key == "query"
    )
    error_message = "geocode_cache is provisioned at 1 read and 1 write unit, keyed by query (D-26, DATA.md)."
  }
}
