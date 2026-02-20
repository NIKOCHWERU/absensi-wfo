#!/bin/bash

# Configuration
DOMAIN="absensiwfo.narasumberhukum.online"
PORT=5005
APP_NAME="absensi-wfo"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

echo "=== Starting Deployment for $DOMAIN ==="

# 1. Pull Latest Changes
echo "Pulling latest changes..."
git pull origin main || { echo "Git pull failed"; exit 1; }

# 2. Install Dependencies
echo "Installing dependencies..."
npm install || { echo "npm install failed"; exit 1; }

# 3. Build Application
echo "Building application..."
npm run build || { echo "Build failed"; exit 1; }

# 4. Start/Restart PM2
echo "Managing PM2 process..."
pm2 start ecosystem.config.cjs || pm2 restart ecosystem.config.cjs || { echo "PM2 failed"; exit 1; }
pm2 save

# 5. Configure Nginx
echo "Configuring Nginx for $DOMAIN..."
if [ ! -L "/etc/nginx/sites-enabled/$DOMAIN" ] && [ ! -f "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    echo "Creating isolated Nginx configuration..."
    cat <<EOF | sudo tee $NGINX_CONF
server {
    listen 80;
    server_name $DOMAIN;

    # Anti-collision: Ensure this doesn't capture other domains
    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Link to sites-enabled
    if [ ! -f "/etc/nginx/sites-enabled/$DOMAIN" ]; then
        echo "Linking Nginx sites-enabled..."
        sudo ln -s $NGINX_CONF /etc/nginx/sites-enabled/
    fi

    # Test and Reload
    echo "Testing Nginx configuration..."
    sudo nginx -t && sudo systemctl reload nginx
else
    echo "Nginx configuration already exists. Skipping creation."
fi

# 6. SSL with Certbot
echo "Setting up SSL with Certbot..."
if command -v certbot &> /dev/null; then
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN --redirect
else
    echo "Certbot not found. Please install certbot and run 'sudo certbot --nginx -d $DOMAIN' manually."
fi

echo "=== Deployment Complete ==="
echo "App should be running at https://$DOMAIN"
