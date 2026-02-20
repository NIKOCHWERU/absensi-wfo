module.exports = {
    apps: [{
        name: "absensi-wfo",
        script: "./dist/index.cjs",
        env: {
            NODE_ENV: "production",
            PORT: 5005,
            DATABASE_URL: "mysql://niko:niko@localhost:3306/absensi_wfo", // Update with your VPS DB URL
            GOOGLE_DRIVE_CLIENT_ID: "YOUR_GOOGLE_DRIVE_CLIENT_ID",
            GOOGLE_DRIVE_CLIENT_SECRET: "YOUR_GOOGLE_DRIVE_CLIENT_SECRET",
            GOOGLE_DRIVE_REFRESH_TOKEN: "YOUR_GOOGLE_DRIVE_REFRESH_TOKEN",
            GOOGLE_DRIVE_FOLDER_ID: "YOUR_GOOGLE_DRIVE_FOLDER_ID",
            GOOGLE_DRIVE_FOLDER: "YOUR_GOOGLE_DRIVE_FOLDER_ID",
            GOOGLE_REDIRECT_URL: "https://absensiwfo.narasumberhukum.online/auth/google/callback",
            GOOGLE_STORAGE_LIMIT_GB: "200",
            GOOGLE_CALENDAR_HOLIDAYS_ID: "en.indonesian#holiday@group.v.calendar.google.com"
        }
    }]
};
