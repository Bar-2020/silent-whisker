# infra

The AWS setup as code (CDK, TypeScript). After the one-time setup below, every merge to `main`
deploys from GitHub Actions with the `production` environment's OIDC role: no AWS keys are
stored anywhere (D-02).

| Stack | Region | Holds |
|---|---|---|
| `SilentWhiskerDeployRole` | eu-north-1 | The GitHub deploy role, the $20 a month AWS Budget (D-22) |

## One-time setup

The account is a project from AWS's simplified sign-up, locked to eu-north-1 (D-49). Run in AWS
CloudShell (the `>_` icon in the console), signed in to that project. CloudShell already has the
AWS CLI; check `node --version` is 22.18 or newer.

```bash
git clone https://github.com/Bar-2020/silent-whisker.git && cd silent-whisker
npm ci
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
npx cdk bootstrap aws://$ACCOUNT/eu-north-1
BUDGET_EMAIL=you@example.com npx cdk deploy SilentWhiskerDeployRole
```

`cdk bootstrap` creates the roles and bucket CDK deploys through. The last command prints
`DeployRoleArn` and AWS emails the budget address to confirm it.

Then in GitHub, Settings, Environments: create `production`, limit it to the `main` branch, and
add two variables: `AWS_DEPLOY_ROLE_ARN` (the printed ARN) and `BUDGET_EMAIL`.

Before the Free plan ends (about 2027-04-18): upgrade to the Paid plan and set the project's
spend limit to $20 a month in AWS Settings, Billing (D-22).

## Local checks

`npm run cdk -- synth` builds the templates without AWS access (set `BUDGET_EMAIL` to any
address). The stacks' tests run in `npm run verify`.
