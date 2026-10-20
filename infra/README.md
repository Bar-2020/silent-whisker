# infra

The AWS setup as code, in Terraform (D-02). Two modules, each with its own state file in one S3
bucket:

| Module | Applied by | Holds |
|---|---|---|
| `bootstrap/` | you, by hand, once | The deploy user, the deployer role and its lock |
| `app/` | GitHub Actions, on every merge to `main` | Everything the app runs on |

GitHub never applies `bootstrap/`, so a deploy can never change its own permissions.

All commands run in CloudShell (the `>_` icon in the AWS console), signed in to the project
(D-49). CloudShell's home folder holds only 1 GB, so everything goes in `/tmp`, which is emptied
when the session ends.

## One-time setup

**1. Terraform** (CloudShell does not have it):

```bash
cd /tmp && curl -sLo tf.zip https://releases.hashicorp.com/terraform/1.16.6/terraform_1.16.6_linux_amd64.zip
unzip -o -q tf.zip terraform && export PATH=/tmp:$PATH && terraform version
```

**2. The state bucket**, where Terraform keeps its record of what exists. Terraform cannot make
the bucket it stores itself in, so it is made by hand. Versioning keeps every old record.

```bash
BUCKET=silent-whisker-tfstate-$(aws sts get-caller-identity --query Account --output text)
aws s3api create-bucket --bucket $BUCKET --region eu-north-1 \
  --create-bucket-configuration LocationConstraint=eu-north-1
aws s3api put-bucket-versioning --bucket $BUCKET --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket $BUCKET --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

**3. The bootstrap module:**

```bash
rm -rf /tmp/silent-whisker && git clone --depth 1 https://github.com/Bar-2020/silent-whisker.git /tmp/silent-whisker
cd /tmp/silent-whisker/infra/bootstrap
terraform init -backend-config="bucket=$BUCKET"
terraform apply
```

`terraform apply` first shows the plan, every resource it will create, then asks; answer `yes`.
It prints `deploy_user_name` and `deployer_role_arn`.

**4. The deploy key.** Make it by hand, so it never sits in Terraform's state:

```bash
aws iam create-access-key --user-name silent-whisker-deploy \
  --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text
```

It prints the key id, then the secret. Copy them straight into GitHub, never anywhere else.

**5. GitHub**, Settings:
1. Environments: create `production`, limit it to the `main` branch, and add two environment
   secrets: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
2. Secrets and variables, Actions, Variables tab: add two repository variables:
   `AWS_DEPLOY_ROLE_ARN` (the printed `deployer_role_arn`) and `DEPLOY_ENABLED` with the value
   `true`. The deploy job checks `DEPLOY_ENABLED` before the environment loads.

Then run `clear` and close CloudShell, so the secret is not left on screen.

## Replacing the key (about every 90 days)

Make a new key as in step 4, update the two GitHub secrets, then delete the old key:
`aws iam list-access-keys --user-name silent-whisker-deploy` shows both;
`aws iam delete-access-key --user-name silent-whisker-deploy --access-key-id OLD_ID`. A user can
hold two keys at once, so nothing breaks in between.

## AWS Budget, by hand

CloudFormation cannot create a budget in eu-north-1, so it was made once in the console (D-22):
Billing and Cost Management, Budgets, Create budget, Customize (advanced), Cost budget. Monthly,
fixed, $10, aggregated by Unblended costs. Budget scope: filter Charge type to **Usage** only, so
it counts usage before credits and warns while the Free plan credit is burning (a new account
lists no Usage yet: add the filter once it does). Alerts: actual cost over 80%, and forecasted
cost over 100%, both to your email.

Before the Free plan ends (about 2027-04-18): upgrade to the Paid plan and set the project's
spend limit to $20 a month in AWS Settings, Billing (D-22).

## Local checks

`npm run infra` (part of `npm run verify`, so CI and the Stop hook run it) checks every module
without AWS: `terraform fmt`, `validate`, and `terraform test`, which runs the `tests/` files
against a mock AWS.
