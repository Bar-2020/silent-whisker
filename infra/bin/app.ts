import { App } from 'aws-cdk-lib';
import { HOME_REGION } from '../../src/constants/aws';
import { DeployRoleStack } from '../deploy-role-stack';

const budgetEmail = process.env.BUDGET_EMAIL;
if (!budgetEmail) {
  throw new Error('Set BUDGET_EMAIL to the address that gets AWS Budget alerts.');
}

const app = new App();
const account = process.env.CDK_DEFAULT_ACCOUNT;

new DeployRoleStack(app, 'SilentWhiskerDeployRole', {
  env: { account, region: HOME_REGION },
  budgetEmail,
});
