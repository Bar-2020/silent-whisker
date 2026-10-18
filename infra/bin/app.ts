import { App } from 'aws-cdk-lib';
import { HOME_REGION } from '../../src/constants/aws';
import { DeployUserStack } from '../deploy-user-stack';

const app = new App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: HOME_REGION };

new DeployUserStack(app, 'SilentWhiskerDeployUser', { env });
