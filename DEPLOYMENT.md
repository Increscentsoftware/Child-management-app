# 🚀 Azure Static Web Apps Deployment Guide

## Prerequisites
- Azure account (free tier works)
- GitHub account
- Code pushed to GitHub repository

## Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Shishu Mandir app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/shishu-mandir.git
git push -u origin main
```

## Step 2: Create Azure Static Web App

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → Search for **Static Web App**
3. Click **Create**
4. Fill in:
   - **Subscription:** Your subscription
   - **Resource Group:** Create new → `shishu-mandir-rg`
   - **Name:** `shishu-mandir-app`
   - **Plan type:** Free
   - **Region:** Choose closest to India (e.g., Central India)
   - **Source:** GitHub
   - **GitHub account:** Authorize and select your account
   - **Organization:** Your username
   - **Repository:** `shishu-mandir`
   - **Branch:** `main`

5. Build Details:
   - **Build Presets:** React
   - **App location:** `/`
   - **Api location:** *(leave empty)*
   - **Output location:** `dist`

6. Click **Review + Create** → **Create**

## Step 3: Wait for Deployment

- Azure will create a GitHub Action workflow
- First deployment takes 3-5 minutes
- You'll get a URL like: `https://nice-beach-123abc.azurestaticapps.net`

## Step 4: Add Environment Variables

1. In Azure Portal → Your Static Web App → **Configuration**
2. Click **+ Add**
3. Add these:
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://YOUR_PROJECT_ID.supabase.co`
   
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: `your_anon_key_here`

4. Click **Save**
5. The app will auto-redeploy

## Step 5: Configure Custom Domain (Optional)

1. Buy a domain (e.g., from Namecheap, GoDaddy)
2. In Azure → Your app → **Custom domains**
3. Click **+ Add**
4. Follow the DNS configuration steps
5. Example: `app.shishumandir.org`

## Step 6: Test PWA Installation

1. Open your deployed URL on mobile (Android/iOS)
2. Browser will show "Add to Home Screen" prompt
3. Install and test offline mode!

## Auto-Deploy on Git Push

Every `git push` to `main` branch triggers automatic deployment via GitHub Actions!

```bash
# Make changes
git add .
git commit -m "Update feature X"
git push
# Wait 2-3 minutes → live on Azure!
```

## Monitoring

- **Logs:** Azure Portal → Your app → **Logs**
- **Analytics:** Enable Application Insights (optional)

## Cost

- **Free tier:** 100 GB bandwidth/month, custom domains, SSL
- Perfect for NGO use case!

---

## Alternative: Deploy to Vercel (Simpler)

```bash
npm install -g vercel
vercel login
vercel --prod
# Follow prompts, add env variables in dashboard
```

Vercel URL: `https://shishu-mandir.vercel.app`

---

## Need Help?

- Azure docs: https://learn.microsoft.com/en-us/azure/static-web-apps/
- Supabase docs: https://supabase.com/docs
