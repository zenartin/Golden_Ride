import boto3

ec2 = boto3.client('ec2', region_name='us-east-1')
print("Finding running EC2 instances...")
response = ec2.describe_instances(Filters=[
    {'Name': 'instance-state-name', 'Values': ['running', 'pending']}
])

instance_ids = []
for r in response['Reservations']:
    for i in r['Instances']:
        instance_ids.append(i['InstanceId'])

if instance_ids:
    print(f"Terminating instances: {instance_ids}")
    ec2.terminate_instances(InstanceIds=instance_ids)
    
    # Wait for termination
    waiter = ec2.get_waiter('instance_terminated')
    waiter.wait(InstanceIds=instance_ids)
    print("Instances terminated.")
else:
    print("No running instances found.")
