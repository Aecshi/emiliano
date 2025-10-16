#!/bin/bash

echo "Creating deployment packages for Emiliano Restaurant POS System..."
echo

# Create directories if they don't exist
mkdir -p deployment/packages
mkdir -p deployment/packages/frontend
mkdir -p deployment/packages/backend

# Package frontend
echo "Packaging frontend..."
cp -r dist/* deployment/packages/frontend/
cp netlify.toml deployment/packages/frontend/
echo "Frontend packaged successfully!"
echo

# Package backend
echo "Packaging backend..."
cp -r api/* deployment/packages/backend/api/
mkdir -p deployment/packages/backend/api
cp .htaccess deployment/packages/backend/
cp api/.htaccess deployment/packages/backend/api/
echo "Backend packaged successfully!"
echo

# Package database script
echo "Packaging database script..."
cp deployment/export_database.sql deployment/packages/backend/
echo "Database script packaged successfully!"
echo

# Package documentation
echo "Packaging documentation..."
cp deployment/README.md deployment/packages/
cp deployment/netlify-deployment-steps.md deployment/packages/
cp deployment/infinityfree-deployment-steps.md deployment/packages/
cp deployment/testing-checklist.md deployment/packages/
echo "Documentation packaged successfully!"
echo

echo "All packages created successfully!"
echo "Packages are available in the 'deployment/packages' directory."
echo
