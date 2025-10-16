# Netlify Deployment Steps

Follow these steps to deploy your React frontend to Netlify:

## 1. Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in to your account
2. Click the "+" icon in the top right corner and select "New repository"
3. Name your repository (e.g., "emiliano-restaurant-pos")
4. Choose "Public" or "Private" visibility
5. Click "Create repository"

## 2. Push Your Code to GitHub

Run these commands in your terminal:

```bash
# Initialize git if not already done
git init

# Add all files to git
git add .

# Commit changes
git commit -m "Initial commit"

# Set the main branch
git branch -M main

# Add your GitHub repository as remote
git remote add origin https://github.com/yourusername/emiliano-restaurant-pos.git

# Push to GitHub
git push -u origin main
```

## 3. Deploy to Netlify

1. Go to [Netlify](https://app.netlify.com/) and sign in (create an account if you don't have one)
2. Click "New site from Git"
3. Select "GitHub" as your Git provider
4. Authorize Netlify to access your GitHub account
5. Select your repository from the list
6. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
7. Click "Show advanced" and add an environment variable:
   - Key: `VITE_API_URL`
   - Value: `https://your-infinityfree-subdomain.infinityfree.net/api`
8. Click "Deploy site"

## 4. Wait for Deployment

Netlify will now build and deploy your site. This usually takes 1-3 minutes.

## 5. Access Your Deployed Site

Once deployment is complete, Netlify will provide you with a URL like `https://random-name-123456.netlify.app`.

## 6. Configure Custom Domain (Optional)

1. In the Netlify dashboard, go to "Site settings" > "Domain management"
2. Click "Add custom domain"
3. Follow the instructions to set up your domain

## 7. Update API URL in Production

After deployment, if you need to update the API URL:

1. Go to "Site settings" > "Build & deploy" > "Environment"
2. Edit the `VITE_API_URL` variable with the correct API URL
3. Trigger a new deployment by clicking "Trigger deploy" > "Deploy site"

## 8. Verify Deployment

1. Visit your Netlify URL
2. Check that the application loads correctly
3. Verify that it can connect to your API (when deployed)

---

Your React frontend is now deployed on Netlify! The next step is to deploy your PHP backend to InfinityFree.
