import { CfnOutput, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';

interface HostingStackProps extends StackProps {
  /** The built app (`dist/`): the pages and `/locales/` (D-32). */
  readonly siteDir: string;
}

/**
 * The app's files on a private bucket behind CloudFront, on its default `*.cloudfront.net`
 * address (D-36). No WAF: the account allows none, so files have no per-IP limit (D-38, D-49).
 */
export class HostingStack extends Stack {
  constructor(scope: Construct, id: string, props: HostingStackProps) {
    super(scope, id, props);

    // Build output only: every deploy rewrites it from git, so old versions would just cost.
    // eslint-disable-next-line sonarjs/aws-s3-bucket-versioning
    const bucket = new Bucket(this, 'SiteBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const distribution = new Distribution(this, 'Site', {
      defaultBehavior: { origin: S3BucketOrigin.withOriginAccessControl(bucket) },
      defaultRootObject: 'index.html',
    });

    // Uploads the build and clears CloudFront's cache, so new wording shows without waiting.
    new BucketDeployment(this, 'DeploySite', {
      sources: [Source.asset(props.siteDir)],
      destinationBucket: bucket,
      distribution,
    });

    new CfnOutput(this, 'SiteUrl', { value: `https://${distribution.distributionDomainName}` });
  }
}
