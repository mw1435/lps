# Entrant Dashboard

A mobile-friendly dashboard to mark entrants as paid and track payment status.

## Deployment to Netlify

### Step 1: Prepare your GitHub

1. Create a GitHub account if you don't have one
2. Create a new repository named `entrant-dashboard`
3. Push this code to your repo:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/entrant-dashboard.git
   git push -u origin main
   ```

### Step 2: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) and sign up (use GitHub to sign in)
2. Click "New site from Git"
3. Choose GitHub and select your `entrant-dashboard` repo
4. Click "Deploy site"
5. Netlify will give you a URL like `https://your-site-name.netlify.app`

### Step 3: Update Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Find your OAuth 2.0 credentials
3. Add your Netlify URL to Authorized redirect URIs:
   - `https://your-site-name.netlify.app`
4. Save

### Step 4: Use on your phone

1. Visit your Netlify URL on your phone
2. Enter your Google Client ID
3. Connect with Google
4. You can now tap names to mark paid and add new entrants

## Local development

```
npm install
npm start
```

Visit `http://localhost:3000` in your browser.
