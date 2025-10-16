# Emiliano Restaurant POS - API Setup Guide

## Overview

This guide will help you set up the PHP backend API to connect your React frontend with your MySQL database in XAMPP.

## Prerequisites

- XAMPP with Apache and MySQL running
- Your `restaurant_pos` database already imported from `database.sql`

## Setup Instructions

### 1. Copy API Files to XAMPP

Copy the entire `api` folder from your project to your XAMPP `htdocs` directory:

```
C:\xampp\htdocs\api\
```

Your directory structure should look like this:

```
C:\xampp\htdocs\api\
├── .htaccess
├── index.php
├── config/
│   └── database.php
└── endpoints/
    ├── dashboard.php
    └── tables.php
```

### 2. Configure Database Connection

Open `api/config/database.php` and verify/update the database settings:

```php
private $host = "127.0.0.1";           // Usually correct for XAMPP
private $db_name = "restaurant_pos";    // Your database name
private $username = "root";             // Default XAMPP MySQL user
private $password = "";                 // Default XAMPP MySQL password (empty)
```

### 3. Update React API Configuration

In `src/lib/api.ts`, update the API base URL if needed:

```typescript
const API_BASE_URL = "http://localhost/api"; // Default XAMPP Apache port
// OR if using different port:
// const API_BASE_URL = 'http://localhost:8080/api';
```

### 4. Enable Apache mod_rewrite (if not already enabled)

1. Open XAMPP Control Panel
2. Click "Config" next to Apache
3. Select "PHP (php.ini)"
4. Find the line `;extension=rewrite_module` and remove the semicolon
5. Save and restart Apache

### 5. Test the API Setup

#### First, run the setup test:

Open your browser and go to:

```
http://localhost/api/test.php
```

This will check:

- PHP version and configuration
- Database connection status
- Required tables and their data counts
- File structure verification

#### If the test passes, try the API endpoints:

**Test 1: API Status**

```
http://localhost/api/
```

Should return:

```json
{ "message": "Emiliano Restaurant POS API", "version": "1.0.0" }
```

**Test 2: Dashboard Stats**

```
http://localhost/api/dashboard
```

Should return dashboard statistics from your database.

**Test 3: Tables Data**

```
http://localhost/api/tables
```

Should return all tables from your `restaurant_tables` table.

## Troubleshooting

### Common Issues:

1. **"Access-Control-Allow-Origin" Error**

   - Make sure the `.htaccess` file is in the `api` folder
   - Check that mod_rewrite is enabled in Apache

2. **Database Connection Error**

   - Verify MySQL is running in XAMPP
   - Check database credentials in `config/database.php`
   - Ensure `restaurant_pos` database exists

3. **404 Not Found**

   - Check that files are in the correct XAMPP htdocs location
   - Verify Apache is running
   - Check the API URL in `src/lib/api.ts`

4. **API Returns Empty Data**
   - Check that your database has data in the required tables
   - Verify table names match your database schema

### Development Mode

For development, you can run both servers:

1. React frontend: `npm run dev` (usually http://localhost:5173)
2. XAMPP Apache serving PHP API: http://localhost/api

## Next Steps

Once the API is working:

1. The dashboard will show real data from your database
2. Table management will be fully functional
3. You can extend the API to add more endpoints for orders, menu, etc.

## Database Tables Used

The API currently uses these tables:

- `daily_sales` - For dashboard sales statistics
- `restaurant_tables` - For table management
- `orders` and `order_items` - For order counts and bill amounts
- `users` - For user management (currently using user_id = 1)

Make sure these tables exist and have data for the API to work properly.
