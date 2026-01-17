#!/bin/sh
set -eu

bucket_prefix="${EXPORT_BUCKET_PREFIX:-gbt-exports}"
bucket_name="${bucket_prefix}-local"

if ! awslocal s3api head-bucket --bucket "$bucket_name" >/dev/null 2>&1; then
  awslocal s3 mb "s3://${bucket_name}" >/dev/null
fi

echo "Localstack S3 bucket ready: ${bucket_name}"
