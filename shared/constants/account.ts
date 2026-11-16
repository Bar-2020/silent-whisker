import auth from './auth.json';

/** How long a deleted account's marker lives: the whole life of an ID token, which Terraform also reads (D-109). */
export const ID_TOKEN_LIFE_SECONDS = auth.id_token_seconds;

/** The key prefix, in `daily_usage_counters`, of the marker that makes `GET /profile` refuse a deleted member's token (D-109). */
export const DELETED_ACCOUNT_KEY_PREFIX = 'deleted_account#';
