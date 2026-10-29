# Provisioned, inside the always-free units (D-26).
resource "aws_dynamodb_table" "geocode_cache" {
  name                        = "geocode_cache"
  billing_mode                = "PROVISIONED"
  read_capacity               = local.capacity.geocode_cache.read
  write_capacity              = local.capacity.geocode_cache.write
  hash_key                    = "query"
  deletion_protection_enabled = true

  attribute {
    name = "query"
    type = "S"
  }
}
