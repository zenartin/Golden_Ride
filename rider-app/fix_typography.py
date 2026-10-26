import os
import re

dir_path = '/Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/rider-app/src/screens'

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            # Replace ...Typography.whatever with fontSize: Typography.whatever
            new_content = re.sub(r'\.\.\.Typography\.(\w+)', r'fontSize: Typography.\1', content)
            
            if new_content != content:
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f"Fixed {path}")

