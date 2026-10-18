import { CfnOutput, Stack } from 'aws-cdk-lib';
import { PolicyStatement, User } from 'aws-cdk-lib/aws-iam';

/**
 * The AWS user GitHub Actions deploys as (D-02). The account forbids the OIDC provider a keyless
 * login needs (D-49), so its access key is a GitHub `production` environment secret, made by hand
 * (infra/README.md), never by this stack. The user can do one thing: hand off to the roles
 * `cdk bootstrap` made, which hold the actual deploy rights. No console password.
 */
export class DeployUserStack extends Stack {
  constructor(...args: ConstructorParameters<typeof Stack>) {
    super(...args);

    const user = new User(this, 'GitHubDeployUser');
    user.addToPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [`arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-*`],
      })
    );

    new CfnOutput(this, 'DeployUserName', { value: user.userName });
  }
}
