import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, it } from 'vite-plus/test';
import cdkJson from '../cdk.json' with { type: 'json' };
import { DeployRoleStack } from './deploy-role-stack';

// The same feature flags `cdk deploy` uses, so the tested template is the deployed one.
const app = new App({ context: cdkJson.context });
const template = Template.fromStack(new DeployRoleStack(app, 'Test'));

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
