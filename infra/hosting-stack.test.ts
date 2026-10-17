import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, it } from 'vite-plus/test';
import cdkJson from '../cdk.json' with { type: 'json' };
import { HostingStack } from './hosting-stack';

const app = new App({ context: cdkJson.context });
const template = Template.fromStack(new HostingStack(app, 'Test', { siteDir: 'public' }));

describe('hosting (D-36: one CloudFront address for the app and /locales/)', () => {
  it('keeps the bucket private, reachable only through CloudFront', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  });

  it('serves index.html at the root and only over HTTPS', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'index.html',
        DefaultCacheBehavior: Match.objectLike({ ViewerProtocolPolicy: 'redirect-to-https' }),
      }),
    });
  });

  it('keeps the bucket when the stack is deleted', () => {
    template.hasResource('AWS::S3::Bucket', { DeletionPolicy: 'Retain' });
  });
});
