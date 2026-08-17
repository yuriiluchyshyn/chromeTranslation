# Chrome Web Store Build Instructions

This document explains how to create a clean, web store-ready package of your Chrome extension.

## 🎯 Overview

The build scripts automatically:
- ✅ Copy all necessary extension files
- 🧹 Remove personal information and development artifacts  
- 🔧 Validate all JavaScript and manifest files
- 📦 Create a optimized ZIP package for Chrome Web Store
- 🔒 Perform security checks
- 📏 Verify size limits compliance

## 🚀 Quick Start

### Option 1: Using Bash Script (Recommended)
```bash
./scripts/build-webstore.sh
```

### Option 2: Using Node.js Script
```bash
# Install dependencies first
npm install

# Run the build
npm run build
```

## 📋 What Gets Included

### Core Extension Files
- `manifest.json` - Extension configuration
- `background.js` - Service worker
- `content.js` - Content script for web pages
- `popup.html` / `popup.js` - Extension popup interface
- `options.html` / `options.js` - Settings page
- `offscreen.html` / `offscreen.js` - Offscreen document for advanced features

### Assets
- `icons/` - Extension icons (16, 32, 48, 128px)
- `pdfjs/` - PDF.js library for PDF translation support

### Generated Files
- `WEBSTORE_README.txt` - Package information for reviewers

## 🧹 What Gets Cleaned Up

### Development Files Removed
- `.DS_Store` (macOS metadata)
- `*.backup`, `*.bak` (backup files)
- `*.log` (log files) 
- `*.tmp` (temporary files)
- `.vscode/`, `.idea/` (IDE settings)
- `*.swp`, `*.swo` (vim swap files)

### Personal Information Cleaned
- No hardcoded API keys (users set their own)
- No personal development artifacts
- No sensitive configuration files

## 📦 Build Output

### File Structure
```
webstore-build/
└── chrome-translator-extension-YYYYMMDD-HHMMSS.zip
```

### ZIP Contents
```
├── manifest.json
├── background.js
├── content.js  
├── popup.html
├── popup.js
├── options.html
├── options.js
├── offscreen.html
├── offscreen.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png  
│   ├── icon48.png
│   └── icon128.png
├── pdfjs/
│   └── [PDF.js library files]
└── WEBSTORE_README.txt
```

## ✅ Validation Checks

### Automatic Validation
- ✅ **JSON Syntax** - `manifest.json` parsed and validated
- ✅ **JavaScript Syntax** - All `.js` files checked for syntax errors
- ✅ **HTML Structure** - Basic HTML file validation
- ✅ **File Size Limits** - Chrome Web Store 25MB limit verification
- ✅ **Security Review** - Manifest permissions audit

### Manual Checks Needed
- 📸 Store listing screenshots
- 📝 Extension description
- 🔒 Privacy policy (if collecting user data)
- 💳 Developer account ($5 one-time verification fee)

## 🚀 Chrome Web Store Submission

### Step-by-Step Process

1. **Go to Developer Console**
   - Visit: https://chrome.google.com/webstore/devconsole/
   - Sign in with your Google account

2. **Create New Item**
   - Click "Add new item"
   - Upload your generated ZIP file

3. **Fill Store Listing**
   - **Description**: Detailed explanation of features
   - **Screenshots**: At least 1 (up to 5) showing the extension in action
   - **Category**: Productivity or Language Tools
   - **Language**: Select primary language

4. **Required Fields**
   - **Single Purpose**: Describe the main translation functionality
   - **Permission Justification**: Explain why broad permissions are needed
   - **Privacy Practices**: Declare data collection (API keys are local only)

5. **Submit for Review**
   - Review process typically takes 1-3 business days
   - May require additional information or changes

### Store Listing Template

**Title**: AI Text Translator
**Summary**: Translate text on any website or PDF with AI-powered accuracy
**Description**:
```
Translate selected text on any website or PDF document with advanced AI translation capabilities.

KEY FEATURES:
🌐 Universal Translation - Works on all websites and PDF files
🤖 AI-Powered - Uses Google Gemini for enhanced translation quality  
🗣️ Text-to-Speech - Hear pronunciation of translations
📚 Smart Dictionary - Persistent translation history
🎨 Draggable Panel - Move and resize translation interface
🔧 Customizable - Multiple language pairs and translation styles

SUPPORTED LANGUAGES:
• Ukrainian • English • Polish • Spanish • German
• Auto-detection for source language

PRIVACY:
• All translations stored locally in your browser
• API keys (if provided) stored securely on your device
• No personal data transmitted except selected text for translation

Perfect for students, professionals, and anyone reading content in foreign languages.
```

**Category**: Productivity
**Language**: English

## 🔒 Security & Privacy

### Extension Permissions Explained
- **`<all_urls>`**: Required to translate text on any website
- **`file:///*`**: Allows translation of local PDF files  
- **`storage`**: Saves translation history and user preferences locally
- **`activeTab`**: Access current tab for text selection
- **`scripting`**: Inject translation interface into web pages
- **`offscreen`**: Advanced PDF processing capabilities

### Data Collection
- ✅ **No personal data collection**
- ✅ **API keys stored locally only** 
- ✅ **Translation history stays on device**
- ✅ **Only selected text sent to translation APIs**

## 🐛 Troubleshooting

### Build Script Issues

**"Permission denied"**
```bash
chmod +x scripts/build-webstore.sh
```

**"archiver not found" (Node.js)**
```bash
npm install
```

**"Invalid JSON" Error**
- Check `manifest.json` syntax with a JSON validator
- Ensure no trailing commas or syntax errors

### Chrome Web Store Issues

**"Manifest V3 Required"**
- ✅ Already using Manifest V3

**"Permissions Too Broad"**  
- Justify need for `<all_urls>` in submission notes
- Explain translation functionality requires access to all sites

**"Missing Privacy Policy"**
- Create a simple policy stating no personal data collection
- Host on GitHub Pages or similar free service

## 📞 Support

For build issues:
1. Check the console output for specific error messages
2. Verify all required files exist in the project directory
3. Ensure Node.js is installed (for Node.js version)
4. Check file permissions (for bash version)

For Chrome Web Store submission issues:
1. Review Google's extension policies
2. Check the developer console error messages
3. Ensure all store listing fields are completed
4. Verify screenshots meet requirements (1280x800 or 640x400)

## 🔄 Version Updates

When updating the extension:

1. **Update Version Number**
   ```json
   // In manifest.json
   "version": "3.8"  // Increment version
   ```

2. **Rebuild Package**
   ```bash
   ./scripts/build-webstore.sh
   ```

3. **Upload to Store** 
   - Use "Upload Updated Package" in developer console
   - Include changelog in update description

## 📄 License

This build system is provided as-is for creating clean Chrome Web Store packages. The extension itself should include appropriate licensing information in the store listing.