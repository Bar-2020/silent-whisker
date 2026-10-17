# AWS facts

The facts behind D-13, D-15, D-22 and D-49. Every page below was read on 2026-10-13. The per-region
prices on aws.amazon.com pricing pages are drawn by script, so they were read from the data feed
each page loads (published 2026-09-11 to 2026-10-12). Prices are USD. Re-read the source before a
big decision.

## Regions

| Region | Rekognition DetectLabels and DetectModerationLabels | Guardrails Standard (ApplyGuardrail) | Text may be processed in |
|---|---|---|---|
| eu-north-1 (Stockholm), the Region in use (D-13) | no (S1) | yes, a source Region of the EU profile (S3); tested with Hebrew on 2026-10-17 | the EU list (S3) |
| il-central-1 (Tel Aviv) | yes (S1) | listed (S2, S3) but no `bedrock-runtime` endpoint in the General Reference (S5): test first, D-13 | the EU list or Tel Aviv (S3) |
| eu-central-1 (Frankfurt) | yes (S1) | yes, 50 text units per second (S5) | the EU list (S3) |
| eu-west-1 (Ireland) | yes (S1) | yes, 200 text units per second (S5) | the EU list (S3) |
| eu-south-1 (Milan) | no (S1) | yes (S2, S5) | the EU list (S3) |
| me-central-1 (UAE) | no (S1) | no runtime endpoint (S5) | Asia Pacific Regions (S3) |
| me-south-1 (Bahrain) | no (S1) | no (not in S2, S3 or S5) | none |

- The EU list is eu-central-1, eu-west-1, eu-west-3, eu-north-1, eu-south-1 and eu-south-2
  (guardrail profile `eu.guardrail.v1:0`, S3).
- Tel Aviv supports DetectLabels, DetectModerationLabels, DetectText and the face operations (S1).
  An earlier search snippet saying only DetectFaces and CompareFaces was wrong.
- Cognito, Lambda, DynamoDB and S3 have endpoints in all seven Regions (S7). Budgets and CloudFront
  are global, but CloudFormation has no `AWS::Budgets::Budget` in eu-north-1 (CDK's Region check,
  2026-10-17), so the budget is made by hand.
- Standard tier is required for Hebrew: it lists Hebrew as "Supported", not "Optimized". Classic
  tier covers only English, French and Spanish, and AWS warns that guardrails are ineffective in
  unsupported languages (S6).
- Standard tier always uses cross-Region inference through a guardrail profile (S2). Only the
  guardrail configuration stays in the home Region, the text may move within the geography (S4).
  AWS charges nothing extra for it (S4).
- InvokeGuardrailChecks ($0.07 per 1,000 units) is not available in any of these Regions (S19).

## Costs

| Item | Figure | Source |
|---|---|---|
| CloudFront, pay-as-you-go (the default) | always free: 1 TB out and 10,000,000 requests a month | S10 |
| CloudFront flat-rate Free plan | $0. Includes WAF (5 rules) and IP-based rate limiting (block an IP over a set number of requests in 5 minutes). 1M requests and 100 GB a month are not hard limits: no overage charge, delivery may be adjusted above them. Pro is $15 a month for 10M requests. Needs a WAF web ACL, so not possible in this account (D-38, D-49). 5 cache behaviors, 3 Free plans per account | S10, S21 |
| AWS WAF, pay-as-you-go | $5 per web ACL and $1 per rule a month, $0.60 per million requests, on top of CloudFront. A rate-based rule is an ordinary rule | S22 |
| Rekognition DetectLabels, DetectModerationLabels | first 1M images a month: $1.00 per 1,000 in us-east-1 and Ireland, $1.20 in Tel Aviv and Frankfurt | S8 |
| Rekognition free tier | the page still shows 12 months of 1,000 images a month; new accounts get credits instead, plan on none | S8, S12 |
| Guardrails text content filters | $0.15 per 1,000 text units (1 unit is up to 1,000 characters), same for Classic and Standard, no free tier | S9 |
| Cognito | 10,000 MAU always free on Lite or Essentials (Plus has none); Google is a social provider, so it counts here, not in the 50 MAU SAML/OIDC bucket | S11, S18 |
| Lambda | always free: 1M requests and 400,000 GB-seconds a month | S12, S14 |
| DynamoDB | always free: 25 GB, 25 WCU, 25 RCU, but only for provisioned capacity. On-demand in Tel Aviv: $0.85 per million writes, $0.17 per million reads | S12, S15 |
| S3 | no free allowance for a new account. Standard per GB-month: $0.0250 Tel Aviv, $0.0245 Frankfurt, $0.0230 Ireland | S12, S16 |
| Budgets | monitoring is free, the first two action-enabled budgets are free | S12, S17 |
| Amazon Location Service (city lookup, D-29) | 20,000 geocode requests a month free, for 3 months only; the price after that is in the developer guide, not read | S20 |

## Free plan

- A new account gets $100 of credit and can earn up to $100 more by completing activities (S13).
- The Free plan ends after 6 months or when the credit is used, whichever comes first. Then the
  account closes and AWS keeps the data 90 days, unless upgraded to the Paid plan (S13).
- The Free plan cannot be charged. Always-free offers stay on both plans (S12, S13).
- The account is a "project" from AWS's new simplified sign-up (D-49). It is locked to one Region
  picked from the contact address (Israel gets eu-north-1 Stockholm), with no opt-in Regions (so
  no Tel Aviv), no WAF on CloudFront and no multi-Region features. Bedrock calls that create no
  resource still work in every Region enabled by default (S23). Stockholm has no Rekognition (S1).
- A project on the Paid plan can have a spend limit, at least $20 a month: at the limit AWS pauses
  the project and keeps the data for 90 days. AWS says spend limits "exclude credits" (S24); check
  in AWS Settings, when setting it, whether it counts usage before or after credits.
- "Activate advanced features" lifts the limits, but needs the Paid plan first, deletes spend
  limits and cannot be undone (S25).
- The Free plan of the account in use ends about 2027-04-18 (183 days left on 2026-10-17).

## Monthly estimate

Assumptions: 2 photos per member per month, one photo check per photo (D-09), 2 text
writes per member per day of 1 text unit each, 30 days.

| | 100 members | 1,000 members |
|---|---|---|
| Photo checks | 200 | 2,000 |
| Photo check price | from the photo test | from the photo test |
| Guardrails at $0.15 per 1,000 units (6,000 and 60,000) | $0.90 | $9.00 |
| Moderation total | about $0.90 plus photos | about $9 plus photos |
| S3, DynamoDB on-demand, Lambda, CloudFront, Cognito | under $1 | under $1 |

The cap of $0.50 a day (D-22) allows at most $15 a month, about $91 over 182 days, under the $100
sign-up credit. The AWS Budget is only a backup: it alerts, and is not instant.

## Sources

- S1: https://docs.aws.amazon.com/general/latest/gr/rekognition.html
- S2: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-tiers.html
- S3: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-cross-region-support.html
- S4: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-cross-region.html
- S5: https://docs.aws.amazon.com/general/latest/gr/bedrock.html
- S6: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-supported-languages.html
- S7: https://docs.aws.amazon.com/general/latest/gr/cognito_identity.html,
  https://docs.aws.amazon.com/general/latest/gr/lambda-service.html,
  https://docs.aws.amazon.com/general/latest/gr/ddb.html,
  https://docs.aws.amazon.com/general/latest/gr/s3.html and
  https://docs.aws.amazon.com/general/latest/gr/billing.html (Budgets)
- S8: https://aws.amazon.com/rekognition/pricing/
- S9: https://aws.amazon.com/bedrock/pricing/
- S10: https://aws.amazon.com/cloudfront/pricing/ and
  https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/
- S11: https://aws.amazon.com/cognito/pricing/
- S12: https://aws.amazon.com/free/
- S13: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html
- S14: https://aws.amazon.com/lambda/pricing/
- S15: https://aws.amazon.com/dynamodb/pricing/on-demand/
- S16: https://aws.amazon.com/s3/pricing/
- S17: https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/
- S18: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html
- S19: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-invoke-guardrail-checks.html
- S20: https://aws.amazon.com/location/pricing/ (read 2026-10-14)
- S21: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html
  (read 2026-10-14)
- S22: https://aws.amazon.com/waf/pricing/ (worked examples, read 2026-10-14)
- S23: https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html and
  https://docs.aws.amazon.com/accounts/latest/reference/sign-up-for-aws.html (read 2026-10-17)
- S24: https://docs.aws.amazon.com/accounts/latest/reference/create-spend-limit.html (read 2026-10-17)
- S25: https://docs.aws.amazon.com/accounts/latest/reference/activate-advanced-features.html and
  https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html (read 2026-10-17)
