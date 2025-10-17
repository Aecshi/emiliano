# Deployment Record

## Backend (InfinityFree)

- **Backend URL**: https://emiliano.great-site.net/api
- **Database Host**: sql306.infinityfree.com
- **Database Name**: if0_40183863_restaurant_pos

## Frontend (Netlify)

- **Frontend URL**: [Your Netlify URL]
- **GitHub Repository**: [Your GitHub Repository URL]
- **Environment Variables**:
  - `VITE_API_URL`: https://emiliano.great-site.net/api

## CORS Configuration

The following domains are allowed in CORS settings:

- https://[your-netlify-domain].netlify.app
- https://charming-gingersnap-85c466.netlify.app
- https://emiliano-eats.netlify.app
- https://emiliano-restaurant.netlify.app
- https://main--emiliano-eats.netlify.app

## Deployment Date

- Initial deployment: [Current Date]

## Testing Notes

- [Add your testing notes here]
- [Note any issues or fixes needed]

## Access Information

- Admin Dashboard: [Your Netlify URL]/admin
- Customer Menu: [Your Netlify URL]/customer-menu

## Troubleshooting

If you encounter CORS issues:

1. Check that your Netlify domain is added to the `$allowedOrigins` array in `api/config/database.production.php`
2. Upload the updated file to InfinityFree
3. Clear browser cache and try again

If you encounter API connection issues:

1. Check the browser console for errors
2. Verify that `API_BASE_URL` in `src/lib/api.ts` is set correctly
3. Ensure InfinityFree backend is accessible
