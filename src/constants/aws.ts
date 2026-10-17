// Where the app runs. See docs/AWS.md and DECISIONS.md D-13, D-49.

/** The only Region the AWS account allows (D-13, D-49). */
export const HOME_REGION = 'eu-north-1';

/** The only GitHub repository whose deploy job may act in the AWS account (D-02). */
export const GITHUB_REPOSITORY = 'Bar-2020/silent-whisker';

/** The GitHub environment the deploy job runs in; only `main` may use it. */
export const GITHUB_DEPLOY_ENVIRONMENT = 'production';
