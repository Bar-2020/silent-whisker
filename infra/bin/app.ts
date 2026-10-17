import { App } from 'aws-cdk-lib';
import { HOME_REGION } from '../../src/constants/aws';
import { DeployRoleStack } from '../deploy-role-stack';
import { HostingStack } from '../hosting-stack';

const app = new App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: HOME_REGION };

new DeployRoleStack(app, 'SilentWhiskerDeployRole', { env });
// `npm run build` writes dist/ first.
new HostingStack(app, 'SilentWhiskerHosting', { env, siteDir: 'dist' });
