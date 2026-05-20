# 🚀 QUICK START GUIDE

## For Developers

### 1. Install Node.js
Download and install Node.js 18+ from: https://nodejs.org

### 2. Extract the ZIP
```bash
unzip shishu-mandir.zip
cd shishu-mandir
```

### 3. Run Setup Script
```bash
# On Mac/Linux:
./setup.sh

# On Windows:
npm install
copy .env.example .env.local
```

### 4. Set up Supabase

**4a. Create Supabase Project**
1. Go to https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - Name: `shishu-mandir`
   - Database Password: (generate strong password)
   - Region: Choose closest to India
5. Click "Create project" (takes ~2 minutes)

**4b. Run Database Migration**
1. In Supabase dashboard → SQL Editor
2. Open `supabase/migrations/001_initial_schema.sql` from this project
3. Copy ALL the SQL
4. Paste into Supabase SQL Editor
5. Click **Run** (green play button)
6. Wait for "Success" message

**4c. Create Storage Bucket**
1. Go to Storage in Supabase dashboard
2. Click "Create bucket"
3. Name: `child-photos`
4. Set to **Private**
5. Click Create

**4d. Create Test User**
1. In SQL Editor, open `supabase/create_users.sql`
2. Copy and paste into SQL Editor
3. Click Run
4. You'll get 3 test users (see file for credentials)

**4e. Get API Keys**
1. Go to Settings → API in Supabase
2. Copy:
   - **URL** (looks like: https://xxxxx.supabase.co)
   - **anon public** key (long string starting with eyJ...)

### 5. Configure Environment Variables

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 6. Start Development Server

```bash
npm run dev
```

Open http://localhost:5173

**Login with:**
- Email: `narasimha@shishumandir.org`
- Password: `worker123`

---

## For Non-Developers (Deploy Directly)

### Option A: Deploy to Vercel (Easiest)

1. Push code to GitHub
2. Go to https://vercel.com
3. Import your GitHub repository
4. Add environment variables in settings
5. Deploy!

### Option B: Deploy to Azure Static Web Apps

See `DEPLOYMENT.md` for detailed Azure instructions.

---

## 📱 Install as Mobile App

After deployment:

1. Open the deployed URL on your phone (Android/iOS)
2. Chrome/Safari will show "Add to Home Screen"
3. Tap Add
4. App icon appears on home screen
5. Works offline!

---

## 🆘 Troubleshooting

**"Missing Supabase URL" error:**
- Check `.env.local` exists and has correct values
- Restart dev server after editing `.env.local`

**"Network error" when logging in:**
- Check Supabase project is running (not paused)
- Verify URL and anon key are correct
- Check internet connection

**Login fails:**
- Make sure you ran `create_users.sql` in Supabase
- Try email: `narasimha@shishumandir.org` password: `worker123`

**Offline sync not working:**
- Check browser console for errors
- Verify RLS policies are enabled (run schema again)

---

## 📚 Learn More

- Full documentation: See `README.md`
- Database schema: See `supabase/migrations/001_initial_schema.sql`
- Deployment guide: See `DEPLOYMENT.md`

---

## ✅ Success Checklist

- [ ] Node.js installed
- [ ] `npm install` completed
- [ ] Supabase project created
- [ ] Database schema migrated
- [ ] Storage bucket created
- [ ] Test users created
- [ ] `.env.local` configured
- [ ] Dev server running
- [ ] Can login successfully
- [ ] Can add a test child
- [ ] Offline mode works

---

**Need help?** Check browser console (F12) for errors.
