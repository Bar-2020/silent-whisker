import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, it } from 'vite-plus/test';
import cdkJson from '../cdk.json' with { type: 'json' };
import { DeployRoleStack } from './deploy-role-stack';

// The same feature flags `cdk deploy` uses, so the tested template is the deployed one.
const app = new App({ context: cdkJson.context });
const template = Template.fromStack(
  new DeployRoleStack(app, 'Test', { budgetEmail: 'alerts@example.com' })
);

describe('deploy role (D-02: GitHub deploys with OIDC, no stored keys)', () => {
  it('trusts only the production environment of this repository', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                'token.actions.githubusercontent.com:sub':
                  'repo:Bar-2020/silent-whisker:environment:production',
              },
            },
          }),
        ],
      },
    });
  });

  it('may only assume the CDK bootstrap roles', () => {
    template.resourceCountIs('AWS::IAM::Policy', 1);
    // Arrays match exactly: one statement, nothing else allowed.
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Resource: { 'Fn::Join': ['', Match.arrayWith([':role/cdk-hnb659fds-*'])] },
          }),
        ],
      },
    });
  });
});

describe('AWS Budget (D-22)', () => {
  it('is 20 USD a month before credits and emails at 80% actual and 100% forecast', () => {
    template.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: {
        BudgetLimit: { Amount: 20, Unit: 'USD' },
        TimeUnit: 'MONTHLY',
        BudgetType: 'COST',
        CostTypes: { IncludeCredit: false },
      },
      NotificationsWithSubscribers: [
        Match.objectLike({
          Notification: Match.objectLike({ NotificationType: 'ACTUAL', Threshold: 80 }),
          Subscribers: [{ SubscriptionType: 'EMAIL', Address: 'alerts@example.com' }],
        }),
        Match.objectLike({
          Notification: Match.objectLike({ NotificationType: 'FORECASTED', Threshold: 100 }),
        }),
      ],
    });
  });
});
