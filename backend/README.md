# backend

The Lambda handlers behind the API ([docs/API.md](../docs/API.md)). The server enforces every rule
([docs/RULES.md](../docs/RULES.md)); the app only mirrors them for the user's convenience.

- One folder per handler, for example `backend/log-feeding/`. Code two handlers use lives in
  `backend/shared/`, such as `metered-call.ts`, through which every metered AWS call goes.
- `npm run build:backend` bundles each handler into `backend/dist/<name>/` (its code and the AWS SDK
  parts it uses, config in `vite.config.ts`); Terraform zips that folder ([infra/app/api.tf](../infra/app/api.tf)).
  A new handler is a new entry there, a new route in `shared/constants/api.json` and in `api.tf`.
- Data that will grow is a data file beside its handler, for example
  `backend/municipal-import/sources.json`.
- Limits and thresholds come from `shared/constants/`, never from the frontend and never as a
  number in a handler.
- The backend never imports from `frontend/`, and `frontend/` never imports from here. They meet
  only in `shared/`.
- Its own `package.json` holds the AWS SDK clients and the test mocks. The root one holds tooling
  only.
