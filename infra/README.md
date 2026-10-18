# infra

The AWS setup as code (CDK, TypeScript). After the one-time setup below, every merge to `main`
deploys from GitHub Actions as a deploy-only AWS user (D-02).

| Stack | Region | Holds |
|---|---|---|
| `SilentWhiskerDeployUser` | eu-north-1 | The AWS user GitHub deploys as; it may only assume the CDK roles |

All commands run in CloudShell (the `>_` icon in the AWS console), signed in to the project
(D-49). CloudShell's home folder holds only 1 GB, so everything goes in `/tmp`, which is emptied
when the session ends. Check `node --version` is 22.18 or newer; if it is older, run
`export N_PREFIX=/tmp/n PATH=/tmp/n/bin:$PATH && npx -y n 24` first.

## One-time setup

```bash
export npm_config_cache=/tmp/npm-cache
rm -rf /tmp/silent-whisker && git clone --depth 1 https://github.com/Bar-2020/silent-whisker.git /tmp/silent-whisker
cd /tmp/silent-whisker && npm ci --ignore-scripts
npx cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/eu-north-1
npx cdk deploy SilentWhiskerDeployUser
```

`cdk bootstrap` creates the roles and bucket CDK deploys through. When CDK lists security changes
and asks to deploy, answer `y`. The last command prints `DeployUserName`. Make its access key:

```bash
aws iam create-access-key --user-name PASTE_DeployUserName_HERE \
  --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text
```

It prints the key id, then the secret. Copy them straight into GitHub, never anywhere else. In
GitHub, Settings:
1. Environments: create `production`, limit it to the `main` branch, and add two environment
   secrets: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
2. Secrets and variables, Actions, Variables tab: add the repository variable `DEPLOY_ENABLED`
   with the value `true`. The deploy job checks it before the environment loads.

## Replacing the key (about every 90 days)

Make a new key as above, update the two GitHub secrets, then delete the old key:
`aws iam list-access-keys --user-name NAME` shows both; `aws iam delete-access-key --user-name
NAME --access-key-id OLD_ID`. A user can hold two keys at once, so nothing breaks in between.

## AWS Budget, by hand

CloudFormation cannot create a budget in eu-north-1, so make it once in the console (D-22):
Billing and Cost Management, Budgets, Create budget, Customize (advanced), Cost budget. Monthly,
fixed, $10, aggregated by Unblended costs. Budget scope: filter Charge type to **Usage** only, so
it counts usage before credits and warns while the Free plan credit is burning (a new account
lists no Usage yet: add the filter once it does). Alerts: actual cost over 80%, and forecasted
cost over 100%, both to your email.

Before the Free plan ends (about 2027-04-18): upgrade to the Paid plan and set the project's
spend limit to $20 a month in AWS Settings, Billing (D-22).

## Local checks

`npm run cdk -- synth` builds the templates without AWS access and runs CDK's checks, such as
"this resource type does not exist in this Region". CI runs it too. The stacks' tests run in
`npm run verify`.
