# 🚀 Deployment Guide - GitHub & Vercel

Complete step-by-step guide to deploy your AI Noise Remover to production.

---

## 📋 Prerequisites

Before you start, make sure you have:
- [ ] GitHub account ([Sign up here](https://github.com/signup))
- [ ] Vercel account ([Sign up here](https://vercel.com/signup))
- [ ] PostgreSQL database (free options below)

---

## Part 1️⃣: Setup PostgreSQL Database (FREE)

You need a PostgreSQL database for production. Choose one:

### Option A: Neon (Recommended - Easy & Free)

1. Go to [neon.tech](https://neon.tech)
2. Click "Sign Up" (use GitHub to sign in)
3. Click "Create a Project"
4. Name it: `ai-noise-remover`
5. Select region closest to you
6. Click "Create Project"
7. **Copy the connection string** - it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
8. Save this - you'll need it later!

### Option B: Supabase (Also Free)

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create new project
4. Go to Settings → Database
5. Copy "Connection string" (URI format)

### Option C: Railway (Free tier)

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Choose "Provision PostgreSQL"
4. Click on PostgreSQL → Connect
5. Copy "Postgres Connection URL"

---

## Part 2️⃣: Push to GitHub

### Step 1: Initialize Git (if not already done)

Open terminal in your project folder and run:

```bash
git init
git add .
git commit -m "Initial commit - AI Noise Remover with Sweet Voice"
```

### Step 2: Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click the **"+"** icon (top right) → "New repository"
3. Repository name: `ai-noise-remover`
4. Description: `AI-powered background noise removal with sweet voice enhancement`
5. Choose **Public** or **Private**
6. **DON'T** check "Initialize with README" (we already have files)
7. Click "Create repository"

### Step 3: Push Your Code

GitHub will show you commands. Copy and run them:

```bash
git remote add origin https://github.com/YOUR_USERNAME/ai-noise-remover.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

**✅ Your code is now on GitHub!**

---

## Part 3️⃣: Deploy to Vercel

### Step 1: Import Project

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Find your `ai-noise-remover` repository
5. Click "Import"

### Step 2: Configure Project

**Framework Preset**: Next.js (should auto-detect)

**Root Directory**: `./` (leave as is)

**Build Command**: 
```bash
npm run build
```

**Output Directory**: 
```
.next
```

**Install Command**:
```bash
npm install
```

### Step 3: Add Environment Variables

⚠️ **IMPORTANT**: Click "Environment Variables" section

Add this variable:

**Name**: `DATABASE_URL`  
**Value**: Paste your PostgreSQL connection string from Part 1  
**Environment**: Production, Preview, Development (select all)

Example:
```
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
```

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. You'll see "🎉 Congratulations!"

**✅ Your app is now live!**

---

## Part 4️⃣: Setup Database Schema

Your database is empty. You need to create the tables.

### Option A: Using Drizzle Studio (Recommended)

1. In your **local** project, create a `.env` file:
   ```bash
   DATABASE_URL=your_production_database_url_here
   ```

2. Run this command:
   ```bash
   npx drizzle-kit push
   ```

3. Type `yes` when asked to confirm

**✅ Database tables created!**

### Option B: Manual SQL (Alternative)

1. Go to your database provider (Neon/Supabase/Railway)
2. Open SQL editor
3. Run this SQL:

```sql
CREATE TABLE IF NOT EXISTS audio_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename VARCHAR(255) NOT NULL,
  original_file_size INTEGER NOT NULL,
  processed_filename VARCHAR(255),
  processed_file_size INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

**✅ Database ready!**

---

## Part 5️⃣: Test Your Deployment

1. Go to your Vercel deployment URL (looks like `https://ai-noise-remover-xxx.vercel.app`)
2. Try uploading an audio file
3. Check if processing works
4. Listen to the audio players
5. Download the cleaned file

**✅ Everything should work!**

---

## 🔧 Troubleshooting

### Issue: "Database connection failed"

**Solution**:
- Check your `DATABASE_URL` in Vercel environment variables
- Make sure it includes `?sslmode=require` at the end
- Verify the database is accessible from the internet

### Issue: "FFmpeg not found"

**Solution**:
- This shouldn't happen - Vercel supports FFmpeg
- If it does, the app will install `ffmpeg-static` automatically

### Issue: "File upload fails"

**Solution**:
- Vercel has a 4.5MB limit for serverless functions
- For larger files, consider using Vercel Edge Functions
- Or upgrade to Vercel Pro ($20/month)

### Issue: "Processing timeout"

**Solution**:
- Free Vercel plan has 10-second timeout
- Upgrade to Pro for 300-second timeout
- Or use Vercel Edge Functions

---

## 🎨 Custom Domain (Optional)

### Add Your Own Domain

1. Go to your Vercel project
2. Click "Settings" → "Domains"
3. Enter your domain (e.g., `noiseremover.com`)
4. Follow instructions to update DNS
5. Wait for SSL certificate (automatic)

**✅ Your site is on your custom domain!**

---

## 🔄 Future Updates

### When You Make Changes:

1. Make changes in your local project
2. Commit changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
3. Vercel will **automatically redeploy**! 🎉

No manual deployment needed!

---

## 📊 Vercel Dashboard Features

After deployment, you can:

- ✅ View deployment logs
- ✅ Monitor performance
- ✅ See visitor analytics
- ✅ Check build history
- ✅ Manage environment variables
- ✅ Set up custom domains
- ✅ Enable preview deployments

---

## 💰 Costs

### FREE Forever:
- GitHub: Unlimited public repos
- Vercel: 100GB bandwidth/month
- Neon: 512MB database storage
- Supabase: 500MB database

### When to Upgrade:
- Need more bandwidth → Vercel Pro ($20/month)
- Need longer processing time → Vercel Pro
- Need more storage → Neon Pro ($19/month)

---

## 🎉 Summary

You've successfully:
- ✅ Created a PostgreSQL database
- ✅ Pushed code to GitHub
- ✅ Deployed to Vercel
- ✅ Set up environment variables
- ✅ Created database schema
- ✅ Tested the live application

**Your AI Noise Remover is now LIVE on the internet!** 🚀

Share your URL with the world! 🌍

---

## 🆘 Need Help?

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Neon Docs**: [neon.tech/docs](https://neon.tech/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

---

## 📝 Quick Reference

**Your Deployment Checklist**:
- [ ] Database created
- [ ] Code on GitHub
- [ ] Imported to Vercel
- [ ] Environment variables set
- [ ] Database schema applied
- [ ] Tested and working

**🎊 Congratulations on your deployment!** 🎊
