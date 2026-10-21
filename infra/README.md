# infra

The AWS setup as code, in Terraform (D-02). Two modules, each with its own state file in one S3
bucket:

| Module | Applied by | Holds |
|---|---|---|
| `bootstrap/` | you, by hand, from your PC | The deploy user, the deployer role and its lock |
| `app/` | GitHub Actions, on every merge to `main` | Everything the app runs on |

GitHub never applies `bootstrap/`, so a deploy can never change its own permissions. Apply only
what is merged to `main`, so AWS never holds something no one reviewed.

## Your PC

You need Terraform (`winget install Hashicorp.Terraform`) and the AWS CLI 2.32 or newer
(`winget install Amazon.AWSCLI`). Sign in with short-lived credentials (they renew every
15 minutes and expire after 12 hours, so no key is stored):

```powershell
aws login --profile silent-whisker
```

The `silent-whisker` profile points at the project (D-49) in eu-north-1. Every command below
uses it. The commands are PowerShell (Windows); in each new PowerShell window run:

```powershell
$env:AWS_PROFILE = 'silent-whisker'
aws sts get-caller-identity   # must show the project's account before anything else
```

## One-time setup

**1. The state bucket**, where Terraform keeps its record of what exists. Terraform cannot make
the bucket it stores itself in, so it is made by hand. Versioning keeps every old record.

```powershell
$BUCKET = "silent-whisker-tfstate-$(aws sts get-caller-identity --query Account --output text)"
aws s3api create-bucket --bucket $BUCKET --region eu-north-1 `
  --create-bucket-configuration LocationConstraint=eu-north-1
aws s3api put-bucket-versioning --bucket $BUCKET --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket $BUCKET --public-access-block-configuration `
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

**2. The bootstrap module**, from an up-to-date `main`:

```powershell
cd infra/bootstrap
terraform init "-backend-config=bucket=$BUCKET"
terraform plan "-out=bootstrap.tfplan"   # quoted: PowerShell splits -out=... at the dot
terraform apply bootstrap.tfplan
```

`plan` shows every resource it would create (`+`), change (`~`) or delete (`-`) and changes
nothing. `apply` with the saved plan does exactly what you read, nothing else. It prints
`deploy_user_name` and `deployer_role_arn`.

**3. The deploy key.** Make it by hand in your own terminal, so it never sits in Terraform's state
or in a chat:

```powershell
aws iam create-access-key --user-name silent-whisker-deploy `
  --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text
```

It prints the key id, then the secret. Copy them straight into GitHub, never anywhere else, then
clear the terminal.

**4. GitHub**, Settings:
1. Environments: create `production`, limit it to the `main` branch, and add three environment
   secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `ALERT_EMAIL`, where the cost
   circuit breaker's alert goes (D-51). After the first deploy AWS emails that address a link to
   confirm the subscription; click it, or no alert arrives.
2. Secrets and variables, Actions, Variables tab: add two repository variables:
   `AWS_DEPLOY_ROLE_ARN` (the printed `deployer_role_arn`) and `DEPLOY_ENABLED` with the value
   `true`. The deploy job checks `DEPLOY_ENABLED` before the environment loads, so set it last.

## Every merge to `main`

The CI deploy job logs in as the deploy user, switches into the deployer role, builds the app,
runs `terraform apply` in `app/` (today: the private bucket and CloudFront, D-36), uploads `dist/`
with `aws s3 sync`, clears CloudFront's cache, removes old files, and prints the address as
`Live at https://...`.

## Replacing the key (about every 90 days)

Make a new key as in step 3, update the two GitHub secrets, then delete the old key:
`aws iam list-access-keys --user-name silent-whisker-deploy` shows both;
`aws iam delete-access-key --user-name silent-whisker-deploy --access-key-id OLD_ID`. A user can
hold two keys at once, so nothing breaks in between.

## AWS Budget, by hand

CloudFormation cannot create a budget in eu-north-1, so it was made once in the console (D-22):
Billing and Cost Management, Budgets, Create budget, Customize (advanced), Cost budget. Monthly,
fixed, $10, aggregated by Unblended costs. Budget scope: filter Charge type to **Usage** only, so
it counts usage before credits and warns while the Free plan credit is burning (a new project
lists no Usage yet: add the filter once it does). Alerts: actual cost over 80%, and forecasted
cost over 100%, both to your email.

Before the Free plan ends (about 2027-04-18): upgrade to the Paid plan and set the project's
spend limit to $20 a month in AWS Settings, Billing (D-22).

## Offline checks

Two commands check every module without AWS, using `scripts/iac-offline-checks.sh`. Both are part of
`npm run verify`, so CI and the Stop hook run them:

- `npm run lint:iac`: `terraform fmt` (layout) and `terraform validate` (typos, references, types).
- `npm run test:iac`: `terraform test`, which runs the `tests/` files against a mock AWS.

They use their own working folder (`.terraform-check/`), so they never touch the real state.
