# Deployment Guide for Emiliano Restaurant POS System

This guide will walk you through deploying the Emiliano Restaurant POS system to free hosting providers.

## 1. Frontend Deployment (Netlify)

### Prerequisites

- GitHub account
- Netlify account (free tier)

### Steps

1. **Push your code to GitHub**

   - Create a new repository on GitHub
   - Push your local code to the repository

   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/emiliano-eats.git
   git push -u origin main
   ```

2. **Deploy to Netlify**

   - Log in to Netlify (https://app.netlify.com/)
   - Click "New site from Git"
   - Select GitHub as your Git provider
   - Authorize Netlify to access your GitHub account
   - Select your repository
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click "Deploy site"

3. **Configure Environment Variables**

   - After deployment, go to Site settings > Build & deploy > Environment
   - Add the following environment variable:
     - Key: `VITE_API_URL`
     - Value: `https://your-infinityfree-subdomain.infinityfree.net/api`

4. **Set Up Custom Domain (Optional)**
   - In Netlify dashboard, go to Site settings > Domain management
   - Click "Add custom domain"
   - Follow the instructions to set up your domain

## 2. Backend Deployment (InfinityFree)

### Prerequisites

- InfinityFree account (free tier)

### Steps

1. **Sign Up for InfinityFree**

   - Go to https://infinityfree.net/ and create an account
   - Activate your account through the email you receive

2. **Create a New Hosting Account**

   - Log in to your InfinityFree account
   - Click "Create Account" to create a new hosting account
   - Choose a subdomain (e.g., emiliano-restaurant.infinityfree.net)
   - Wait for the account to be created (usually instant)

3. **Access Control Panel**

   - Click on "Control Panel" for your new hosting account
   - Log in to the control panel

4. **Create MySQL Database**

   - In the control panel, go to "MySQL Databases"
   - Create a new database
   - Note down the database name, username, and password

5. **Import Database**

   - In the control panel, go to "phpMyAdmin"
   - Select your database
   - Click on "Import" tab
   - Upload the `export_database.sql` file
   - Click "Go" to import the database

6. **Configure Database Connection**

   - Edit `api/config/database.production.php` with your database credentials:
     - Update `$host` with your MySQL host (usually sql.infinityfree.com)
     - Update `$db_name` with your database name
     - Update `$username` with your database username
     - Update `$password` with your database password

7. **Upload Files**

   - In the control panel, go to "File Manager" or use FTP
   - Navigate to the public_html directory
   - Upload all files from your project (including the `api` directory)
   - Make sure `.htaccess` files are also uploaded

8. **Update CORS Settings**
   - Edit `api/config/database.production.php`
   - Update the `$allowedOrigins` array to include your Netlify domain

## 3. Testing the Deployed Application

1. **Test Frontend**

   - Visit your Netlify domain (e.g., https://emiliano-restaurant.netlify.app)
   - Verify that the application loads correctly

2. **Test API Connection**

   - Try logging in with the default admin credentials:
     - Username: `admin`
     - Password: `password`
   - Verify that you can see the dashboard and data

3. **Test Features**
   - Test the main features of the application:
     - Table management
     - Order creation
     - Menu items
     - Reports
     - Admin functionality

## 4. Troubleshooting

### CORS Issues

If you encounter CORS errors:

1. Verify that your Netlify domain is included in the `$allowedOrigins` array in `api/config/database.production.php`
2. Check that the `.htaccess` file is properly uploaded and configured

### API Connection Issues

If the frontend can't connect to the API:

1. Verify that the `VITE_API_URL` environment variable is correctly set in Netlify
2. Check that the API endpoints are accessible directly (try visiting `https://your-infinityfree-subdomain.infinityfree.net/api/tables`)

### Database Connection Issues

If the API can't connect to the database:

1. Verify your database credentials in `api/config/database.production.php`
2. Check that the database tables are properly imported

## 5. Security Considerations

1. **Change Default Credentials**

   - After deployment, log in with the default admin credentials
   - Immediately change the admin password
   - Create new user accounts as needed

2. **Secure API Endpoints**

   - Consider implementing rate limiting
   - Ensure all sensitive endpoints require authentication

3. **Regular Backups**
   - Regularly export your database for backup
   - Store backups in a secure location

## 6. Maintenance

1. **Updates**

   - To update the application, rebuild and redeploy the frontend on Netlify
   - Upload updated PHP files to InfinityFree

2. **Monitoring**
   - Regularly check the application for errors
   - Monitor database size (InfinityFree has limits)

---

For any issues or questions, please refer to the documentation or contact support.
