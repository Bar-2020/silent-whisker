// Where the app runs and what it may spend. See docs/AWS.md and DECISIONS.md D-13, D-22, D-49.

/** The only Region the AWS account allows (D-13, D-49). */
export const HOME_REGION = 'eu-north-1';

/** The only GitHub repository whose deploy job may act in the AWS account (D-02). */
export const GITHUB_REPOSITORY = 'Bar-2020/silent-whisker';

/** The GitHub environment the deploy job runs in; only `main` may use it. */
export const GITHUB_DEPLOY_ENVIRONMENT = 'production';

/** AWS Budget, an email backstop to the daily moderation cap (D-22). */
export const MONTHLY_BUDGET_USD = 20;

/** Email when actual spend passes this share of the budget, in percent. */
export const BUDGET_ACTUAL_ALERT_PERCENT = 80;

/** Email when the month's forecast passes this share of the budget, in percent. */
export const BUDGET_FORECAST_ALERT_PERCENT = 100;
