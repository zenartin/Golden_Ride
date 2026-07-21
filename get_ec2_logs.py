import boto3

ec2 = boto3.client('ec2', region_name='us-east-1')
response = ec2.get_console_output(InstanceId='i-0909c948d8500ea9c')
output = response.get('Output', '')

with open('ec2_logs.txt', 'w', encoding='utf-8') as f:
    f.write(output)
print("Saved to ec2_logs.txt")
