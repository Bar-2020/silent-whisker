# infra

The AWS setup as code (CDK, TypeScript). After the one-time setup below, every merge to `main`
deploys from GitHub Actions with the `production` environment's OIDC role: no AWS keys are
stored anywhere (D-02).

| Stack | Region | Holds |
|---|---|---|
| `SilentWhiskerDeployRole` | us-east-1 (IAM and Budgets are global) | The GitHub deploy role, the $20 a month AWS Budget (D-22) |

## One-time setup

Run in AWS CloudShell (the `>_` icon in the AWS console), signed in as the account owner.
CloudShell already has the AWS CLI; check `node --version` is 22.18 or newer.

```bash
git clone https://github.com/Bar-2020/silent-whisker.git && cd silent-whisker
npm ci
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
npx cdk bootstrap aws://$ACCOUNT/us-east-1 aws://$ACCOUNT/il-central-1
BUDGET_EMAIL=you@example.com npx cdk deploy SilentWhiskerDeployRole
```

`cdk bootstrap` creates the roles and bucket CDK deploys through, once per Region. The last
command prints `DeployRoleArn` and AWS emails the budget address to confirm it.

Then in GitHub, Settings, Environments: create `production`, limit it to the `main` branch, and
add two variables: `AWS_DEPLOY_ROLE_ARN` (the printed ARN) and `BUDGET_EMAIL`.

## Local checks

`npm run cdk -- synth` builds the templates without AWS access (set `BUDGET_EMAIL` to any
address). The stacks' tests run in `npm run verify`.
