#!/bin/bash

# WinterLine Desktop Copy Script
# Copies essential project files to your Desktop

echo "🚀 WinterLine - Copy to Desktop"
echo "================================"
echo ""

# Destination
DEST="/Users/gauravkumar/Desktop/Personal/WinterLine"

echo "This will copy WinterLine to:"
echo "  $DEST"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Create destination directory
echo "📁 Creating destination directory..."
mkdir -p "$DEST"

# Copy directories
echo "📦 Copying directories..."
cp -r routes "$DEST/" 2>/dev/null
cp -r db "$DEST/" 2>/dev/null
cp -r scripts "$DEST/" 2>/dev/null
cp -r public "$DEST/" 2>/dev/null

# Copy essential files
echo "📄 Copying files..."
cp *.js "$DEST/" 2>/dev/null
cp *.json "$DEST/" 2>/dev/null
cp *.md "$DEST/" 2>/dev/null
cp *.sh "$DEST/" 2>/dev/null
cp .env.example "$DEST/" 2>/dev/null
cp .gitignore "$DEST/" 2>/dev/null
cp vercel.json "$DEST/" 2>/dev/null

# Make scripts executable
chmod +x "$DEST"/*.sh

echo ""
echo "✅ Copy complete!"
echo ""
echo "📍 Project location:"
echo "   $DEST"
echo ""
echo "🔧 Next steps:"
echo "   cd $DEST"
echo "   npm install"
echo "   ./deploy-now.sh"
echo ""
