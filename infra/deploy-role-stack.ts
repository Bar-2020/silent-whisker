import { CfnOutput, Stack } from 'aws-cdk-lib';
import {
  OidcProviderNative,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { GITHUB_DEPLOY_ENVIRONMENT, GITHUB_REPOSITORY } from '../src/constants/aws';

const GITHUB_OIDC_HOST = 'token.actions.githubusercontent.com';

/**
 * The role GitHub Actions deploys with: no stored keys (D-02). The AWS Budget (D-22) is not here:
 * CloudFormation cannot create one in eu-north-1, so it is made once by hand (infra/README.md).
 */
export class DeployRoleStack extends Stack {
  constructor(...args: ConstructorParameters<typeof Stack>) {
    super(...args);

    const provider = new OidcProviderNative(this, 'GitHubOidc', {
      url: `https://${GITHUB_OIDC_HOST}`,
      clientIds: ['sts.amazonaws.com'],
    });

    const role = new Role(this, 'GitHubDeployRole', {
      description: `Deploys ${GITHUB_REPOSITORY} from its ${GITHUB_DEPLOY_ENVIRONMENT} environment`,
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

    new CfnOutput(this, 'DeployRoleArn', { value: role.roleArn });
  }
}
