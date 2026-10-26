$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$ErrorActionPreference = "Stop"

Write-Host "Creating S3 bucket for uploads..."
$accountId = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" sts get-caller-identity --query Account --output text
$uploadsBucket = "golden-ride-uploads-$accountId"
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 mb s3://$uploadsBucket --region us-east-1
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3api put-public-access-block --bucket $uploadsBucket --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3api put-bucket-policy --bucket $uploadsBucket --policy "{`"Version`":`"2012-10-17`",`"Statement`":[{`"Sid`":`"PublicReadGetObject`",`"Effect`":`"Allow`",`"Principal`":`"*`",`"Action`":`"s3:GetObject`",`"Resource`":`"arn:aws:s3:::$uploadsBucket/*`"}]}"

Write-Host "Creating Security Group..."
$sgId = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ec2 create-security-group --group-name GoldenRideSG --description "Golden Ride Backend SG" --query GroupId --output text
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 80 --cidr 0.0.0.0/0
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 443 --cidr 0.0.0.0/0
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 8001 --cidr 0.0.0.0/0

Write-Host "Creating UserData Script..."
$userData = @"
#!/bin/bash
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

$awsAccessKey = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" configure get aws_access_key_id
$awsSecretKey = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" configure get aws_secret_access_key

cat << 'EOF' > driver-app/backend/.env
DATABASE_URL=postgresql://postgres:12345@postgres:5432/golden_ride
SECRET_KEY=production_secret_key_golden_ride_!@#
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
AWS_S3_BUCKET_NAME=$uploadsBucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=$awsAccessKey
AWS_SECRET_ACCESS_KEY=$awsSecretKey
EOF

docker-compose up -d --build
"@

Set-Content -Path "userdata.sh" -Value $userData -Encoding ASCII

Write-Host "Launching EC2 Instance..."
# Amazon Linux 2023 AMI in us-east-1
$amiId = "ami-0b72821e2f351e396"
$instanceId = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ec2 run-instances --image-id $amiId --count 1 --instance-type t3.small --security-group-ids $sgId --user-data file://userdata.sh --associate-public-ip-address --query "Instances[0].InstanceId" --output text

Write-Host "Waiting for instance to be running..."
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ec2 wait instance-running --instance-ids $instanceId
$publicIp = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ec2 describe-instances --instance-ids $instanceId --query "Reservations[0].Instances[0].PublicIpAddress" --output text

Write-Host "Backend EC2 Instance launched successfully!"
Write-Host "Public IP: $publicIp"
Write-Host "API will be available at: http://$publicIp:8001"

Write-Host "Creating S3 Bucket for Admin Panel..."
$adminBucket = "golden-ride-admin-$accountId"
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 mb s3://$adminBucket --region us-east-1
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3api put-public-access-block --bucket $adminBucket --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3api put-bucket-policy --bucket $adminBucket --policy "{`"Version`":`"2012-10-17`",`"Statement`":[{`"Sid`":`"PublicReadGetObject`",`"Effect`":`"Allow`",`"Principal`":`"*`",`"Action`":`"s3:GetObject`",`"Resource`":`"arn:aws:s3:::$adminBucket/*`"}]}"
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 website s3://$adminBucket/ --index-document index.html --error-document index.html

Write-Host "Admin Panel S3 Bucket created!"
Write-Host "Uploads Bucket: $uploadsBucket"
Write-Host "Admin Bucket: $adminBucket"
Write-Host "Admin Website URL: http://$adminBucket.s3-website-us-east-1.amazonaws.com"
