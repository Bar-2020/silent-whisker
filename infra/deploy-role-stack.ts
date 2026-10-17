import { CfnOutput, Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { CfnBudget } from 'aws-cdk-lib/aws-budgets';
import {
  OidcProviderNative,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import {
  BUDGET_ACTUAL_ALERT_PERCENT,
  BUDGET_FORECAST_ALERT_PERCENT,
  GITHUB_DEPLOY_ENVIRONMENT,
  GITHUB_REPOSITORY,
  MONTHLY_BUDGET_USD,
} from '../src/constants/aws';

const GITHUB_OIDC_HOST = 'token.actions.githubusercontent.com';

interface DeployRoleStackProps extends StackProps {
  /** Where budget alerts go. Passed in at deploy time, never committed: the repo is public. */
  readonly budgetEmail: string;
}

/**
 * The account-level pieces: the role GitHub Actions deploys with (no stored keys, D-02) and the
 * monthly AWS Budget (D-22). Both are global services; the stack sits in the home Region.
 */
export class DeployRoleStack extends Stack {
  constructor(scope: Construct, id: string, props: DeployRoleStackProps) {
    super(scope, id, props);

    const provider = new OidcProviderNative(this, 'GitHubOidc', {
      url: `https://${GITHUB_OIDC_HOST}`,
      clientIds: ['sts.amazonaws.com'],
    });

    const role = new Role(this, 'GitHubDeployRole', {
      description: `Deploys ${GITHUB_REPOSITORY} from its ${GITHUB_DEPLOY_ENVIRONMENT} environment`,
      maxSessionDuration: Duration.hours(1),
      assumedBy: new WebIdentityPrincipal(provider.oidcProviderArn, {
        StringEquals: {
          [`${GITHUB_OIDC_HOST}:aud`]: 'sts.amazonaws.com',
          [`${GITHUB_OIDC_HOST}:sub`]: `repo:${GITHUB_REPOSITORY}:environment:${GITHUB_DEPLOY_ENVIRONMENT}`,
        },
      }),
    });
    // Only the roles `cdk bootstrap` made; they hold the actual deploy rights.
    role.addToPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [`arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-*`],
      })
    );

    const subscribers = [{ subscriptionType: 'EMAIL', address: props.budgetEmail }];
    new CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: 'silent-whisker-monthly',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: MONTHLY_BUDGET_USD, unit: 'USD' },
        // Count usage before credits: with credits netted out the Free plan always shows $0, and
        // the alert exists to notice the credit burning fast (D-22).
        costTypes: { includeCredit: false },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: BUDGET_ACTUAL_ALERT_PERCENT,
            thresholdType: 'PERCENTAGE',
          },
          subscribers,
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: BUDGET_FORECAST_ALERT_PERCENT,
            thresholdType: 'PERCENTAGE',
          },
          subscribers,
        },
      ],
    });

    new CfnOutput(this, 'DeployRoleArn', { value: role.roleArn });
  }
}
