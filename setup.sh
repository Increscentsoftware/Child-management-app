#!/bin/bash

# Shishu Mandir - Setup Script
# Run this after cloning the repository

echo "🚀 Shishu Mandir Setup"
echo "======================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node --version) found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Check for .env.local
if [ ! -f .env.local ]; then
    echo "⚠️  Creating .env.local from template..."
    cp .env.example .env.local
    echo "✅ .env.local created"
    echo ""
    echo "📝 IMPORTANT: Edit .env.local and add your Supabase credentials:"
    echo "   1. Go to https://supabase.com"
    echo "   2. Create a new project (or use existing)"
    echo "   3. Go to Settings → API"
    echo "   4. Copy the URL and anon key"
    echo "   5. Paste them in .env.local"
    echo ""
    echo "   Then run: npm run dev"
    echo ""
else
    echo "✅ .env.local already exists"
    echo ""
fi

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up Supabase (see README.md)"
echo "2. Edit .env.local with your Supabase credentials"
echo "3. Run database migrations (see README.md)"
echo "4. Run: npm run dev"
echo ""
