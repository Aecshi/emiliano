# Emiliano Restaurant POS System - Deployment Guide

This comprehensive guide will walk you through deploying the Emiliano Restaurant POS system to free hosting providers.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Process](#deployment-process)
   - [Step 1: Prepare the Deployment Package](#step-1-prepare-the-deployment-package)
   - [Step 2: Deploy the Frontend to Netlify](#step-2-deploy-the-frontend-to-netlify)
   - [Step 3: Deploy the Backend to InfinityFree](#step-3-deploy-the-backend-to-infinityfree)
   - [Step 4: Connect Frontend to Backend](#step-4-connect-frontend-to-backend)
   - [Step 5: Test the Deployed Application](#step-5-test-the-deployed-application)
4. [Alternative Hosting Options](#alternative-hosting-options)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance](#maintenance)

## Overview

The Emiliano Restaurant POS system consists of two main components:

1. **Frontend**: A React application that provides the user interface
2. **Backend**: A PHP API that handles data processing and database operations

We'll deploy these components to free hosting providers:

- Frontend: Netlify (free tier)
- Backend: InfinityFree (free hosting with PHP and MySQL)

## Prerequisites

Before starting the deployment process, ensure you have:

- A GitHub account
- A Netlify account
- An InfinityFree account
- The latest version of your code
- Your code built for production (`npm run build`)

## Deployment Process

### Step 1: Prepare the Deployment Package

1. Run the packaging script to organize your files for deployment:

   **Windows**:

   ```
   deployment\package-for-deployment.bat
   ```

   **Linux/Mac**:

   ```
   ./deployment/package-for-deployment.sh
   ```

2. This will create a `deployment/packages` directory with:
   - `frontend/`: Contains the built React app and Netlify configuration
   - `backend/`: Contains the PHP API and database script
   - Documentation files

### Step 2: Deploy the Frontend to Netlify

Follow the detailed steps in [netlify-deployment-steps.md](netlify-deployment-steps.md), which includes:

1. Creating a GitHub repository
2. Pushing your code to GitHub
3. Connecting Netlify to your GitHub repository
4. Configuring build settings
5. Setting environment variables
6. Deploying the site

### Step 3: Deploy the Backend to InfinityFree

Follow the detailed steps in [infinityfree-deployment-steps.md](infinityfree-deployment-steps.md), which includes:

1. Creating an InfinityFree hosting account
2. Setting up a MySQL database
3. Importing the database schema
4. Configuring database connection settings
5. Uploading backend files
6. Testing the API

### Step 4: Connect Frontend to Backend

1. After deploying both components, update the API URL in your Netlify environment variables:

   - Go to Netlify dashboard > Site settings > Build & deploy > Environment
   - Update `VITE_API_URL` to point to your InfinityFree API URL
   - Trigger a new deployment

2. Update CORS settings in your backend:
   - Edit `api/config/database.production.php` on InfinityFree
   - Add your Netlify domain to the `$allowedOrigins` array

### Step 5: Test the Deployed Application

Use the [testing-checklist.md](testing-checklist.md) to verify that all features of your application are working correctly in the production environment.

## Alternative Hosting Options

### Frontend Alternatives

1. **Vercel**:

   - Similar to Netlify
   - Free tier with good limits
   - Easy GitHub integration
   - [Deployment guide](https://vercel.com/guides/deploying-react-with-vercel)

2. **GitHub Pages**:
   - Free hosting for static sites
   - Limited to GitHub repositories
   - [Deployment guide](https://create-react-app.dev/docs/deployment/#github-pages)

### Backend Alternatives

1. **000webhost**:

   - Free PHP hosting with MySQL
   - 1GB storage and 10GB bandwidth
   - [Deployment guide](https://www.000webhost.com/website-faq/how-to-upload-website)

2. **AwardSpace**:
   - 1GB storage and 5GB bandwidth
   - PHP 8.1 support
   - [Deployment guide](https://www.awardspace.com/kb/)

## Troubleshooting

### Common Issues and Solutions

1. **CORS Errors**:

   - Symptom: API requests fail with CORS errors in the browser console
   - Solution: Ensure your Netlify domain is added to the `$allowedOrigins` array in `api/config/database.production.php`

2. **API Connection Failures**:

   - Symptom: Frontend can't connect to the backend
   - Solution: Verify the API URL in Netlify environment variables and check that the API is accessible

3. **Database Connection Errors**:

   - Symptom: API returns database connection errors
   - Solution: Verify database credentials in `api/config/database.production.php`

4. **Missing .htaccess Files**:

   - Symptom: API routes return 404 errors
   - Solution: Ensure `.htaccess` files are properly uploaded to InfinityFree

5. **PHP Version Issues**:
   - Symptom: PHP errors or blank pages
   - Solution: Set PHP version to at least 7.4 in InfinityFree control panel

## Maintenance

### Regular Maintenance Tasks

1. **Backups**:

   - Regularly export your database
   - Download a copy of your backend files
   - Store backups in a secure location

2. **Updates**:

   - To update the frontend:
     - Make changes locally
     - Build the application (`npm run build`)
     - Push changes to GitHub
     - Netlify will automatically deploy the updates
   - To update the backend:
     - Make changes locally
     - Upload the updated files to InfinityFree

3. **Monitoring**:
   - Regularly check the application for errors
   - Monitor database size (InfinityFree has limits)
   - Check server logs for PHP errors

---

For detailed instructions on specific aspects of deployment, refer to the individual guides in the `deployment` directory.
