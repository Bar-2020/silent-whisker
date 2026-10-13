### Folder structure
Feature-based. `src/features/<feature>/` owns its screens, components, hooks and data access.
`src/shared/` only when a second feature needs it. **Features never import from each other.**
`infra/` is the AWS CDK app, `functions/` the Lambda handlers.
