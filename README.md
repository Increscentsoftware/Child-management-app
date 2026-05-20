# Shishu Mandir — Child Management System

A **production-ready Progressive Web App (PWA)** for NGO field social workers to manage child welfare records **offline-first**, with automatic sync to Supabase when online.

Built with **React + TypeScript + Vite + Dexie (IndexedDB) + Supabase**.

---

## ✨ Features

- ✅ **Offline-first** — Works completely offline, syncs when internet is available
- ✅ **Field-level change tracking** — Every update is logged with who, what, when
- ✅ **Excel bulk import** — Import 300+ existing Excel files at once
- ✅ **Annual follow-ups** — Update child records yearly, auto-sync changes to profile
- ✅ **Photo upload** — Capture child photos (stored in Supabase Storage)
- ✅ **Dashboard & filters** — Search, filter by father status, DV, category, etc.
- ✅ **Installable on mobile** — Add to home screen on Android/iOS
- ✅ **Automatic sync** — Queues offline changes, uploads when online
- ✅ **Row-level security** — Social workers only see their assigned data

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js 18+** and **npm**
- **Supabase account** (free tier works)
- **Git**

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd shishu-mandir
npm install
```

### 3. Set up Supabase

1. Go to [https://supabase.com](https://supabase.com) → Create a new project
2. Wait for the database to provision (~2 mins)
3. Go to **SQL Editor** → Paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run** to create all tables
5. Go to **Storage** → Create a bucket called `child-photos` (set to **private**)
6. Go to **Settings → API** → Copy your `URL` and `anon key`

### 4. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Create a Social Worker User

In Supabase SQL Editor, run:

```sql
-- Create auth user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'worker@shishumandir.org',
  crypt('password123', gen_salt('bf')),
  NOW()
);

-- Create social worker profile
INSERT INTO social_workers (id, full_name, employee_id, role, phone, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Narasimhamurthy R.V.',
  'SW_001',
  'field_worker',
  '9876543210',
  true
);
```

**Login credentials:**
- Email: `worker@shishumandir.org`
- Password: `password123`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📦 Build for Production

```bash
npm run build
```

The build output goes to `dist/` — deploy this to:

- **Azure Static Web Apps** (recommended, free tier)
- **Vercel** / **Netlify** / **Cloudflare Pages**
- Any static hosting service

The app will work **offline** once installed as a PWA!

---

## 🗂️ Project Structure

```
shishu-mandir/
├── src/
│   ├── components/         # Layout, reusable UI
│   ├── pages/              # Login, Dashboard, Children, Profile, Follow-up, Import, ChangeLog
│   ├── lib/
│   │   ├── supabase.ts     # Supabase client
│   │   ├── db.ts           # Dexie (IndexedDB) setup
│   │   ├── sync.ts         # Offline → Supabase sync engine
│   │   ├── store.ts        # Zustand global state (user, online status)
│   │   └── excelImport.ts  # Excel → database mapping logic
│   ├── types/              # TypeScript types
│   ├── App.tsx             # Main router
│   └── main.tsx            # Entry point
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Complete DB schema
├── vite.config.ts          # Vite + PWA config
├── package.json
└── README.md
```

---

## 📊 Database Schema

**Key tables:**

- `children` — Main child record (always current state)
- `annual_followups` — One row per year per child (historical snapshots)
- `change_log` — Field-level audit trail
- `social_workers` — Staff accounts
- `sync_queue` — Offline changes pending upload
- `child_photos` — Photo metadata (files in Supabase Storage)

**See:** `supabase/migrations/001_initial_schema.sql` for full schema.

---

## 🔄 How Offline Sync Works

1. **Offline mode:** All create/update operations write to **IndexedDB** (Dexie) + add to `sync_queue`
2. **Online detection:** Service worker detects when internet returns
3. **Sync engine:** Reads `sync_queue`, uploads pending records to Supabase
4. **Pull latest:** Downloads new data from Supabase into IndexedDB
5. **Conflict resolution:** Last-write-wins (configurable)

---

## 📥 Excel Import Format

The import supports **both formats**:

### Wide format (SSR style)
- Rows = fields (e.g. "Child's name", "Father status")
- Columns = years ("On Admission", "2019-20", "2021-22")

### Tall format (Report style)
- Rows = one child per row
- Columns = field names

**Auto-detects** which format and maps all fields automatically!

---

## 🔐 Security

- **Row-level security (RLS)** enabled on all tables
- Social workers can only read/write children (admins can do more)
- Photos stored in **private** Supabase Storage bucket
- Auth tokens stored securely in browser `localStorage`

---

## 🎨 Design Notes

- Font: **DM Sans** (Google Fonts)
- Primary color: `#1a6b4a` (forest green)
- Mobile-first responsive design
- Designed to work on **small Android phones** (360px wide)

---

## 🧪 Testing

Create test data:

```bash
# In Supabase SQL Editor
INSERT INTO children (id, school_id, full_name, father_status, father_dv, area, is_active)
VALUES
  (gen_random_uuid(), 'TEST-001', 'Test Child 1', 'Alive', false, 'Test Area', true),
  (gen_random_uuid(), 'TEST-002', 'Test Child 2', 'Abandoned', true, 'Test Area', true);
```

---

## 🚢 Deployment Checklist

- [ ] Environment variables set in hosting platform
- [ ] Supabase RLS policies enabled
- [ ] Storage bucket `child-photos` created (private)
- [ ] Social worker accounts created
- [ ] PWA icons added to `public/` (192x192, 512x512)
- [ ] Build and test offline mode
- [ ] Test on real mobile devices

---

## 📞 Support

For issues or questions:
- Check Supabase logs (Dashboard → Logs)
- Check browser console for errors
- Verify `.env.local` variables are correct

---

## 📄 License

Proprietary — Shishu Mandir NGO internal use only.

---

## 🙏 Credits

Built for **Shishu Mandir NGO** to digitize child welfare records and enable field social workers to work offline.
