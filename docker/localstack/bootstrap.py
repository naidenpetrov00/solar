import json
import os
from pathlib import Path

import boto3
from botocore.exceptions import ClientError


BOOTSTRAP_DIRECTORY = Path("/etc/localstack/init/ready.d")
BUCKET = os.environ.get("CATALOG_STORAGE_S3_BUCKET", "solar-catalog")
REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")


def load_json(filename: str) -> dict:
    return json.loads((BOOTSTRAP_DIRECTORY / filename).read_text(encoding="utf-8"))


def bucket_exists(client) -> bool:
    try:
        client.head_bucket(Bucket=BUCKET)
        return True
    except ClientError as error:
        status = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        if status == 404:
            return False
        raise


client = boto3.client(
    "s3",
    endpoint_url="http://localhost:4566",
    region_name=REGION,
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "test"),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "test"),
)

if not bucket_exists(client):
    if REGION == "us-east-1":
        client.create_bucket(Bucket=BUCKET)
    else:
        client.create_bucket(
            Bucket=BUCKET,
            CreateBucketConfiguration={"LocationConstraint": REGION},
        )

policy = load_json("public-assets-policy.json")
policy_text = json.dumps(policy).replace("__CATALOG_BUCKET__", BUCKET)
cors = load_json("cors.json")
browser_origin = os.environ.get("CATALOG_STORAGE_BROWSER_ORIGIN", "").strip()
if browser_origin:
    allowed_origins = cors["CORSRules"][0]["AllowedOrigins"]
    if browser_origin not in allowed_origins:
        allowed_origins.append(browser_origin)
lifecycle = load_json("lifecycle.json")

client.put_bucket_policy(Bucket=BUCKET, Policy=policy_text)
client.put_bucket_cors(Bucket=BUCKET, CORSConfiguration=cors)
client.put_bucket_lifecycle_configuration(
    Bucket=BUCKET,
    LifecycleConfiguration=lifecycle,
)

stored_policy = json.loads(client.get_bucket_policy(Bucket=BUCKET)["Policy"])
stored_cors = client.get_bucket_cors(Bucket=BUCKET)["CORSRules"]
stored_lifecycle = client.get_bucket_lifecycle_configuration(Bucket=BUCKET)["Rules"]

expected_policy = json.loads(policy_text)
expected_pending_prefix = lifecycle["Rules"][0]["Filter"]["Prefix"]

if stored_policy != expected_policy:
    raise RuntimeError("LocalStack catalog bucket policy verification failed.")
if stored_cors != cors["CORSRules"]:
    raise RuntimeError("LocalStack catalog bucket CORS verification failed.")
if len(stored_lifecycle) != 1:
    raise RuntimeError("LocalStack catalog bucket must have exactly one lifecycle rule.")
if stored_lifecycle[0].get("Filter", {}).get("Prefix") != expected_pending_prefix:
    raise RuntimeError("LocalStack lifecycle rule must target only catalog/pending/.")

print(f"LocalStack catalog bucket '{BUCKET}' is ready.")
