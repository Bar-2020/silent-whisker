#!/usr/bin/env bash
# Checks every Terraform module without touching AWS: formatting, then for each module a
# backend-less init, `validate` (types and references) and `terraform test` (mock AWS).
# Part of `npm run verify`, so the Stop hook and CI run it too.
set -euo pipefail

cd "$(dirname "$0")/../infra"

# One shared download of the AWS provider for all modules, instead of one per module.
export TF_PLUGIN_CACHE_DIR="${TF_PLUGIN_CACHE_DIR:-$HOME/.terraform.d/plugin-cache}"
mkdir -p "$TF_PLUGIN_CACHE_DIR"

# A working folder of its own (relative to each module), so a real `terraform init` against the
# S3 state in .terraform/ never makes these offline checks reach for AWS credentials.
export TF_DATA_DIR=.terraform-check

terraform fmt -check -recursive

for module in */; do
  compgen -G "${module}*.tf" >/dev/null || continue # only folders holding Terraform
  echo "--- infra/$module"
  terraform -chdir="$module" init -backend=false -input=false -no-color >/dev/null
  terraform -chdir="$module" validate -no-color
  terraform -chdir="$module" test -no-color
done
