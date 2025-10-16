# InfinityFree Deployment Steps

Follow these steps to deploy your PHP backend to InfinityFree:

## 1. Sign Up for InfinityFree

1. Go to [InfinityFree](https://infinityfree.net/) and click "Sign Up"
2. Fill in the registration form
3. Verify your email address

## 2. Create a Hosting Account

1. Log in to your InfinityFree account
2. Click "Create Account" to create a new hosting account
3. Choose a subdomain (e.g., `emiliano-restaurant.infinityfree.net`)
4. Wait for the account to be created (usually instant)

## 3. Access Control Panel

1. After creating your hosting account, click "Control Panel"
2. Log in with your InfinityFree credentials

## 4. Create a MySQL Database

1. In the control panel, go to "MySQL Databases"
2. Create a new database
3. Note down the database name, username, and password
4. These will look something like:
   - Database name: `epiz_username_dbname`
   - Username: `epiz_username`
   - Password: `generated_password`
   - Host: `sql.infinityfree.com`

## 5. Import Database Schema

1. In the control panel, go to "phpMyAdmin"
2. Select your database from the left sidebar
3. Click on the "Import" tab
4. Click "Choose File" and select your `export_database.sql` file
5. Click "Go" to import the database

## 6. Prepare Backend Files for Upload

1. Update your database configuration file:

   - Open `api/config/database.production.php`
   - Update the database credentials with the ones from step 4:

   ```php
   private $host = "sql.infinityfree.com";
   private $db_name = "epiz_username_dbname";
   private $username = "epiz_username";
   private $password = "your_password";
   ```

2. Update CORS settings:

   - In the same file, update the `$allowedOrigins` array to include your Netlify domain:

   ```php
   $allowedOrigins = [
       'https://your-netlify-app.netlify.app',
       // other origins...
   ];
   ```

3. Create a production flag file:
   - Create an empty file named `production.flag` in your `api` directory

## 7. Upload Files to InfinityFree

### Using File Manager:

1. In the control panel, go to "File Manager"
2. Navigate to the `htdocs` directory (this is your web root)
3. Upload all your files and directories:
   - Upload the `api` directory with all its contents
   - Upload the `.htaccess` file
   - If you want to serve the frontend from the same domain, upload the `dist` directory contents to the root

### Using FTP (Alternative):

1. In the control panel, go to "FTP Accounts"
2. Create a new FTP account or use the default one
3. Use an FTP client (like FileZilla) to connect to your hosting:
   - Host: `ftpupload.net`
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21
4. Navigate to the `htdocs` directory
5. Upload your files as described above

## 8. Test Your API

1. Visit your API endpoint in a browser:

   - `https://your-subdomain.infinityfree.net/api/tables`
   - You should see a JSON response

2. If you see errors:
   - Check the database connection settings
   - Verify that all files were uploaded correctly
   - Make sure `.htaccess` files are properly uploaded

## 9. Update Frontend Configuration

1. Go back to your Netlify site settings
2. Update the `VITE_API_URL` environment variable to point to your InfinityFree API:
   - `https://your-subdomain.infinityfree.net/api`
3. Trigger a new deployment on Netlify

## 10. Additional Configuration

### PHP Version:

1. In the InfinityFree control panel, go to "PHP Settings"
2. Set the PHP version to at least 7.4 or higher

### File Permissions:

1. If you encounter permission issues, use the File Manager to set appropriate permissions:
   - Directories: 755
   - Files: 644

### Custom Domain (Optional):

1. If you have a custom domain, you can set it up in the InfinityFree control panel
2. Go to "Domains" > "Add Domain"
3. Follow the instructions to point your domain to InfinityFree

---

Your PHP backend is now deployed on InfinityFree! Combined with your Netlify frontend, your complete application should now be accessible online.
