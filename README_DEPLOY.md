# VPS Deployment Guide

Since I cannot SSH into your VPS automatically (due to Windows restrictions and missing keys), I have created a deployment script for you.

## 1. SSH into your VPS
```bash
ssh kantor@43.128.84.174
# Password: NIKO1234
```

## 2. Navigate to your app directory
Assuming the app is cloned in `~/absensi-wfo` or you need to clone it:
```bash
# If new:
git clone https://github.com/NIKOCHWERU/absensi-wfo.git
cd absensi-wfo

# If existing:
cd /path/to/absensi-wfo
git pull origin main
```

3. Configure Environment Variables
Create or edit `.env` file on your VPS:
```bash
nano .env
```
Copy the following template and replace `YOUR_...` with the values from your local `.env` file:
```env
DATABASE_URL=mysql://niko:niko@localhost:3306/absensi_wfo
GOOGLE_DRIVE_CLIENT_ID=YOUR_GOOGLE_DRIVE_CLIENT_ID
GOOGLE_DRIVE_CLIENT_SECRET=YOUR_GOOGLE_DRIVE_CLIENT_SECRET
GOOGLE_DRIVE_REFRESH_TOKEN=YOUR_GOOGLE_DRIVE_REFRESH_TOKEN
GOOGLE_DRIVE_FOLDER_ID=YOUR_GOOGLE_DRIVE_FOLDER_ID
GOOGLE_DRIVE_FOLDER=YOUR_GOOGLE_DRIVE_FOLDER_ID
GOOGLE_REDIRECT_URL=https://absensiwfo.narasumberhukum.online/auth/google/callback
GOOGLE_STORAGE_LIMIT_GB=200
GOOGLE_CALENDAR_HOLIDAYS_ID=en.indonesian#holiday@group.v.calendar.google.com
PORT=5000
NODE_ENV=production
```
Save and exit (`Ctrl+X`, `Y`, `Enter`).


## 4. Run Deployment Script
Make the script executable and run it:
```bash
chmod +x deploy.sh
./deploy.sh
```

This script will:
- Install dependencies (`npm install`)
- Build the app (`npm run build`)
- Start the app with PM2
- Configure Nginx for `absensiwfo.narasumberhukum.online`
- Setup SSL with Certbot
