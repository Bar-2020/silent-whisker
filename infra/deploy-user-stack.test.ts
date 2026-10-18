import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, it } from 'vite-plus/test';
import cdkJson from '../cdk.json' with { type: 'json' };
import { DeployUserStack } from './deploy-user-stack';

// The same feature flags `cdk deploy` uses, so the tested template is the deployed one.
const app = new App({ context: cdkJson.context });
const template = Template.fromStack(new DeployUserStack(app, 'Test'));

describe('deploy user (D-02: GitHub deploys with a key limited to the CDK roles)', () => {
  it('has no console password and no access key made by the stack', () => {
    template.resourceCountIs('AWS::IAM::User', 1);
    template.hasResourceProperties('AWS::IAM::User', { LoginProfile: Match.absent() });
    template.resourceCountIs('AWS::IAM::AccessKey', 0);
  });

  it('may only assume the CDK bootstrap roles', () => {
    template.resourceCountIs('AWS::IAM::Policy', 1);
    // Arrays match exactly: one statement, nothing else allowed.
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Resource: { 'Fn::Join': ['', Match.arrayWith([':role/cdk-hnb659fds-*'])] },
          }),
        ],
      },
    });
  });
});
