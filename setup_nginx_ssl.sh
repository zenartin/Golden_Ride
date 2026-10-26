#!/bin/bash
# Nginx & Let's Encrypt SSL Setup Script for Golden Ride
# To be executed on the EC2 server once DNS A-records point to the server IP.

set -e

# Configuration
DOMAIN="54-197-9-181.nip.io"
EMAIL="zenartin3@gmail.com" # Replace with your email for Let's Encrypt notifications
BACKEND_PORT=8001

# Check if run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (using sudo)"
  exit 1
fi

echo "=============================================="
echo "Configuring Nginx Reverse Proxy for $DOMAIN"
echo "=============================================="

# 1. Install Nginx and Certbot
echo "Installing Nginx and Certbot..."
if command -v yum &> /dev/null; then
    # Amazon Linux / RHEL
    yum install -y nginx
    # Enable EPEL and install certbot
    amazon-linux-extras install epel -y || true
    yum install -y certbot python3-certbot-nginx
elif command -v apt-get &> /dev/null; then
    # Ubuntu / Debian
    apt-get update
    apt-get install -y nginx certbot python3-certbot-nginx
else
    echo "Unsupported OS package manager. Please install Nginx and Certbot manually."
    exit 1
fi

# 2. Start Nginx
echo "Starting Nginx service..."
systemctl start nginx
systemctl enable nginx

# 3. Create Nginx Configuration
echo "Writing Nginx configuration for $DOMAIN..."
cat << EOF > /etc/nginx/conf.d/golden_ride.conf
server {
    listen 80;
    server_name $DOMAIN;

    # Increase upload limits for file uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeout settings
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Restart Nginx to apply changes
echo "Testing and restarting Nginx..."
nginx -t
systemctl restart nginx

# 4. Generate SSL Certificate
echo "Obtaining SSL certificate via Let's Encrypt..."
echo "Note: Ensure DNS for $DOMAIN is already pointed to this server's public IP."
if certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect; then
    echo "=============================================="
    echo "SSL Setup Completed Successfully!"
    echo "Your backend is now live at: https://$DOMAIN"
    echo "=============================================="
else
    echo "=============================================="
    echo "WARNING: Let's Encrypt SSL generation failed."
    echo "This is likely because your DNS records for $DOMAIN have not fully propagated yet."
    echo "Nginx is still running on HTTP (port 80) as a reverse proxy."
    echo "Once DNS resolves to this server, manually run the following to enable SSL:"
    echo "  sudo certbot --nginx -d $DOMAIN"
    echo "=============================================="
fi
