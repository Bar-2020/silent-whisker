# The app module: everything the app runs on. GitHub Actions applies it on every merge to `main`,
# as the deployer role from infra/bootstrap/ (D-02).

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }

    # Zips the built Lambda handlers (api.tf).
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # Same state bucket as bootstrap/, its own file. The bucket name is passed at `terraform init`
  # (-backend-config); a backend block cannot read variables or files.
  backend "s3" {
    key          = "app.tfstate"
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
