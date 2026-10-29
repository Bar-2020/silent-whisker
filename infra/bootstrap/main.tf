# Applied by hand from your PC (infra/README.md), never by CI, so a deploy can never change its
# own permissions.

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # The bucket name holds the account id, so it is passed at `terraform init
  # -backend-config=bucket=...`: a backend block cannot read variables or files, which is also why
  # the region is written here again.
  backend "s3" {
    key          = "bootstrap.tfstate"
    region       = "eu-north-1" # = selected_region in shared/constants/aws.json
    use_lockfile = true
  }
}

locals {
  constants = jsondecode(file("${path.module}/../../shared/constants/aws.json"))
}

provider "aws" {
  region = local.constants.selected_region
}
