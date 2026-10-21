# How GitHub Actions gets into AWS (D-02). The account forbids the OIDC provider a keyless login
# needs (D-49), so it is two steps: a user with a key that can do nothing but step 2, and a role
# that holds the deploy rights for at most an hour at a time.

data "aws_caller_identity" "current" {}

locals {
  # Made by hand before the first `terraform init` (infra/README.md); its name holds the account id.
  state_bucket_arn = "arn:aws:s3:::silent-whisker-tfstate-${data.aws_caller_identity.current.account_id}"
}

# Step 1: the identity GitHub logs in as. Its access key is made by hand and kept only as a GitHub
# secret: this file never creates one, so the key never sits in Terraform's state.
resource "aws_iam_user" "deploy" {
  name = "silent-whisker-deploy"
}

# The user's only right: switch into the deployer role.
resource "aws_iam_user_policy" "deploy" {
  name = "assume-deployer"
  user = aws_iam_user.deploy.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sts:AssumeRole"
      Resource = aws_iam_role.deployer.arn
    }]
  })
}

# Step 2: the role each deploy switches into. The trust policy says who may switch in: the user.
resource "aws_iam_role" "deployer" {
  name = "silent-whisker-deployer"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { AWS = aws_iam_user.deploy.arn }
    }]
  })
}

# What a deploy may do: everything, because it creates buckets, CloudFront, and later Lambdas,
# tables and their roles; the lock below keeps it from changing itself.
resource "aws_iam_role_policy_attachment" "deployer_admin" {
  role       = aws_iam_role.deployer.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# The lock. In IAM an explicit Deny beats any Allow, so even with AdministratorAccess a deploy can
# never widen its own rights or the user's, and cannot delete or weaken Terraform's state bucket.
resource "aws_iam_role_policy" "deployer_lock" {
  name = "lock"
  role = aws_iam_role.deployer.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "NoSelfChanges"
        Effect   = "Deny"
        Action   = "iam:*"
        Resource = [aws_iam_user.deploy.arn, aws_iam_role.deployer.arn]
      },
      {
        Sid    = "KeepState"
        Effect = "Deny"
        Action = [
          "s3:DeleteBucket",
          "s3:DeleteBucketPolicy",
          "s3:PutBucketPolicy",
          "s3:PutBucketVersioning",
          "s3:PutLifecycleConfiguration",
        ]
        Resource = local.state_bucket_arn
      },
      {
        # This module's own record: rewriting it could steer the next hand-run apply.
        Sid      = "KeepBootstrapState"
        Effect   = "Deny"
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:DeleteObjectVersion"]
        Resource = "${local.state_bucket_arn}/bootstrap.tfstate*"
      },
    ]
  })
}
