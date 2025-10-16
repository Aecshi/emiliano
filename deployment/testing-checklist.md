# Deployment Testing Checklist

Use this checklist to verify that your deployed application is working correctly.

## 1. Initial Access

- [ ] Frontend loads correctly at Netlify URL
- [ ] No console errors on initial load
- [ ] Login page appears correctly

## 2. Authentication

- [ ] Login with default admin credentials:
  - Username: `admin`
  - Password: `password`
- [ ] Successful login redirects to Dashboard
- [ ] User information appears in the header
- [ ] Logout functionality works
- [ ] Cannot access protected pages without login

## 3. Dashboard

- [ ] Dashboard statistics load correctly
- [ ] Today's sales figure is displayed
- [ ] Recent orders section shows data
- [ ] Table status section shows correct information
- [ ] Navigation to other sections works

## 4. Table Management

- [ ] Tables page loads correctly
- [ ] All tables are displayed
- [ ] Table status indicators (available/occupied) work
- [ ] Can change table status
- [ ] "Join Tables" functionality works
- [ ] "View Orders" button works
- [ ] "Seated for X min" displays correctly

## 5. Menu Management

- [ ] Menu items load correctly
- [ ] Categories are displayed
- [ ] Menu item details (price, description) are correct
- [ ] Menu item images load (if applicable)

## 6. Order Processing

- [ ] Can create a new order
- [ ] Can add items to an order
- [ ] Can specify extras and side options
- [ ] Can submit an order
- [ ] Order appears in the Orders page
- [ ] Can update order status (Mark Ready, Mark Served, etc.)
- [ ] Can view order details

## 7. Payment Processing

- [ ] Can mark an order as paid
- [ ] Cash input modal works correctly
- [ ] Change calculation is accurate
- [ ] Receipt is generated
- [ ] Receipt shows correct information (zero tax)

## 8. QR Code Menu

- [ ] QR code is generated
- [ ] Scanning QR code opens customer menu
- [ ] Customer can browse menu
- [ ] Customer can add items to cart
- [ ] Verification code input works
- [ ] Customer can complete order

## 9. Reports

- [ ] Reports page loads correctly
- [ ] Date range selection works
- [ ] Can generate reports
- [ ] CSV export works
- [ ] PDF export works
- [ ] Excel export works
- [ ] Print functionality works

## 10. Admin Functionality

- [ ] Admin page loads correctly
- [ ] User list is displayed
- [ ] Can edit user information
- [ ] User roles and permissions work correctly

## 11. Mobile Responsiveness

- [ ] Application works on mobile devices
- [ ] Layout adjusts appropriately
- [ ] All features are accessible on mobile

## 12. Error Handling

- [ ] Appropriate error messages for invalid actions
- [ ] Application recovers gracefully from errors
- [ ] Network error handling works

## 13. Performance

- [ ] Page loads quickly
- [ ] Interactions are responsive
- [ ] No noticeable lag when performing actions

## Troubleshooting Common Issues

### API Connection Issues

If the frontend can't connect to the backend:

1. Verify API URL in Netlify environment variables
2. Check CORS configuration in backend
3. Test API endpoints directly in browser

### Database Issues

If data isn't loading:

1. Check database connection in backend
2. Verify database tables are properly imported
3. Check for PHP errors in server logs

### Authentication Issues

If login isn't working:

1. Verify default admin credentials
2. Check for authentication-related errors in console
3. Verify PHP sessions are working correctly

---

After completing this checklist, your application should be fully functional in the production environment.
