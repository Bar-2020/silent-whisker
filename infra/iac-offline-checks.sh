#!/usr/bin/env bash
# Offline checks for the Terraform code in infra/. Nothing here reaches AWS or the real state.
# Called by `npm run lint:iac` and `npm run test:iac`.
set -euo pipefail

mode="${1:-}"
if [[ "$mode" != lint && "$mode" != test ]]; then
  echo "usage: $0 lint|test" >&2
  exit 2
fi

cd "$(dirname "$0")"

export TF_PLUGIN_CACHE_DIR="${TF_PLUGIN_CACHE_DIR:-$HOME/.terraform.d/plugin-cache}"
mkdir -p "$TF_PLUGIN_CACHE_DIR"

# A working folder of its own (relative to each module), so a real `terraform init` against the
# S3 state in .terraform/ never makes these offline checks reach for AWS credentials.
export TF_DATA_DIR=.terraform-check

if [[ "$mode" == lint ]]; then
  terraform fmt -check -recursive
fi

for module in */; do
  compgen -G "${module}*.tf" >/dev/null || continue # only folders holding Terraform
  echo "--- $mode infra/$module"
  terraform -chdir="$module" init -backend=false -input=false -no-color >/dev/null
  if [[ "$mode" == lint ]]; then
    terraform -chdir="$module" validate -no-color
  else
    terraform -chdir="$module" test -no-color
  fi
done
