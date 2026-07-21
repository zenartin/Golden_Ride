import boto3
import time
import os

print("Initializing AWS clients...")
s3 = boto3.client('s3', region_name='us-east-1')
ec2 = boto3.client('ec2', region_name='us-east-1')
sts = boto3.client('sts', region_name='us-east-1')

account_id = sts.get_caller_identity()["Account"]
print(f"Logged in as Account: {account_id}")

uploads_bucket = f"golden-ride-uploads-{account_id}"
admin_bucket = f"golden-ride-admin-{account_id}"

# Create Uploads Bucket
try:
    print(f"Creating uploads bucket: {uploads_bucket}")
    s3.create_bucket(Bucket=uploads_bucket)
    time.sleep(2)
    s3.put_public_access_block(
        Bucket=uploads_bucket,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls': False, 'IgnorePublicAcls': False,
            'BlockPublicPolicy': False, 'RestrictPublicBuckets': False
        }
    )
    time.sleep(2)
    s3.put_bucket_policy(
        Bucket=uploads_bucket,
        Policy='{"Version":"2012-10-17","Statement":[{"Sid":"PublicReadGetObject","Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::' + uploads_bucket + '/*"}]}'
    )
    print("Uploads bucket ready.")
except Exception as e:
    print(f"S3 Error: {e}")

# Create Admin Bucket
try:
    print(f"Creating admin bucket: {admin_bucket}")
    s3.create_bucket(Bucket=admin_bucket)
    time.sleep(2)
    s3.put_public_access_block(
        Bucket=admin_bucket,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls': False, 'IgnorePublicAcls': False,
            'BlockPublicPolicy': False, 'RestrictPublicBuckets': False
        }
    )
    time.sleep(2)
    s3.put_bucket_policy(
        Bucket=admin_bucket,
        Policy='{"Version":"2012-10-17","Statement":[{"Sid":"PublicReadGetObject","Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::' + admin_bucket + '/*"}]}'
    )
    s3.put_bucket_website(
        Bucket=admin_bucket,
        WebsiteConfiguration={
            'ErrorDocument': {'Key': 'index.html'},
            'IndexDocument': {'Suffix': 'index.html'}
        }
    )
    print("Admin bucket ready.")
except Exception as e:
    print(f"S3 Error: {e}")

# Create Security Group
sg_name = "GoldenRideBackendSG"
try:
    print("Creating Security Group...")
    vpc_response = ec2.describe_vpcs(Filters=[{'Name': 'isDefault', 'Values': ['true']}])
    vpc_id = vpc_response.get('Vpcs', [{}])[0].get('VpcId', '')
    sg_response = ec2.create_security_group(GroupName=sg_name, Description='Backend SG', VpcId=vpc_id)
    sg_id = sg_response['GroupId']
    
    ec2.authorize_security_group_ingress(
        GroupId=sg_id,
        IpPermissions=[
            {'IpProtocol': 'tcp', 'FromPort': 22, 'ToPort': 22, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},
            {'IpProtocol': 'tcp', 'FromPort': 80, 'ToPort': 80, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},
            {'IpProtocol': 'tcp', 'FromPort': 443, 'ToPort': 443, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},
            {'IpProtocol': 'tcp', 'FromPort': 8001, 'ToPort': 8001, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},
        ]
    )
    print("Security Group created.")
except Exception as e:
    print(f"SG Error (may already exist): {e}")
    # Get existing SG
    sg_response = ec2.describe_security_groups(Filters=[{'Name': 'group-name', 'Values': [sg_name]}])
    if sg_response['SecurityGroups']:
        sg_id = sg_response['SecurityGroups'][0]['GroupId']
    else:
        sg_id = None

if sg_id:
    # Read AWS Credentials for UserData
    session = boto3.Session()
    credentials = session.get_credentials()
    access_key = credentials.access_key
    secret_key = credentials.secret_key

    user_data = f"""#!/bin/bash
yum update -y
yum install -y docker git
service docker start
systemctl enable docker
curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

mkdir -p /opt/golden_ride
cd /opt/golden_ride
git clone https://github.com/zenartin/Golden_Ride.git .

cat << 'EOF' > driver-app/backend/.env
DATABASE_URL=postgresql://postgres:12345@postgres:5432/golden_ride
SECRET_KEY=production_secret_key_golden_ride_!@#
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
AWS_S3_BUCKET_NAME={uploads_bucket}
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID={access_key}
AWS_SECRET_ACCESS_KEY={secret_key}
EOF

docker-compose up -d --build
"""

    print("Launching EC2 Instance...")
    instances = ec2.run_instances(
        ImageId='ami-0b72821e2f351e396',
        MinCount=1,
        MaxCount=1,
        InstanceType='t3.small',
        SecurityGroupIds=[sg_id],
        UserData=user_data
    )
    instance_id = instances['Instances'][0]['InstanceId']
    print(f"Launched Instance ID: {instance_id}. Waiting for it to run...")
    
    waiter = ec2.get_waiter('instance_running')
    waiter.wait(InstanceIds=[instance_id])
    
    desc = ec2.describe_instances(InstanceIds=[instance_id])
    public_ip = desc['Reservations'][0]['Instances'][0].get('PublicIpAddress', 'Unknown')
    print(f"Backend Server Public IP: {public_ip}")
    print(f"Backend API URL: http://{public_ip}:8001")
    print(f"Admin Panel URL: http://{admin_bucket}.s3-website-us-east-1.amazonaws.com")

    with open("aws_outputs.txt", "w") as f:
        f.write(f"PUBLIC_IP={public_ip}\n")
        f.write(f"ADMIN_BUCKET={admin_bucket}\n")
        f.write(f"UPLOAD_BUCKET={uploads_bucket}\n")

print("Provisioning completed!")
