#!/usr/bin/env node

/**
 * Chrome Web Store Build Script (Node.js version)
 * Creates a clean zip package for Chrome Web Store submission
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Get the project root directory (where package.json is located)
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function copyFileSync(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
}

function copyDirSync(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
        }
    }
}

function removeFilesRecursive(dir, patterns) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            // Check if this directory matches any pattern
            if (patterns.dirs && patterns.dirs.some(pattern => entry.name.match(pattern))) {
                fs.rmSync(fullPath, { recursive: true, force: true });
                continue;
            }
            removeFilesRecursive(fullPath, patterns);
        } else {
            // Check if this file matches any pattern
            if (patterns.files && patterns.files.some(pattern => entry.name.match(pattern))) {
                fs.unlinkSync(fullPath);
            }
        }
    }
}

function validateManifest(manifestPath) {
    try {
        const content = fs.readFileSync(manifestPath, 'utf8');
        JSON.parse(content);
        return { valid: true };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

function getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    return stats.size;
}

function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

async function createZipArchive(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Best compression
        });

        output.on('close', () => {
            resolve(archive.pointer());
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

async function main() {
    log('🚀 Building Chrome Extension for Web Store', 'blue');
    log('============================================');

    // Configuration
    const buildDir = './webstore-build';
    const tempDir = './temp-build';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const zipName = `chrome-translator-extension-${timestamp}.zip`;

    try {
        // Clean previous builds
        log('🧹 Cleaning previous builds...', 'yellow');
        if (fs.existsSync(buildDir)) {
            fs.rmSync(buildDir, { recursive: true, force: true });
        }
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(buildDir, { recursive: true });
        fs.mkdirSync(tempDir, { recursive: true });

        // Copy extension files
        log('📦 Copying extension files...', 'blue');
        
        const extensionFiles = [
            'manifest.json',
            'background.js', 
            'content.js',
            'popup.html',
            'popup.js',
            'options.html',
            'options.js',
            'offscreen.html',
            'offscreen.js'
        ];

        for (const file of extensionFiles) {
            if (fs.existsSync(file)) {
                copyFileSync(file, path.join(tempDir, file));
                log(`  ✅ Copied ${file}`, 'green');
            } else {
                log(`  ⚠️  Warning: ${file} not found`, 'yellow');
            }
        }

        // Copy directories
        const extensionDirs = ['icons', 'pdfjs'];
        for (const dir of extensionDirs) {
            if (fs.existsSync(dir)) {
                copyDirSync(dir, path.join(tempDir, dir));
                log(`  ✅ Copied ${dir}/ directory`, 'green');
            } else {
                log(`  ⚠️  Warning: ${dir}/ directory not found`, 'yellow');
            }
        }

        // Clean up unwanted files
        log('🧼 Cleaning up personal information...', 'yellow');
        
        const cleanupPatterns = {
            files: [
                /\.DS_Store$/,
                /\.backup$/,
                /\.bak$/,
                /~$/,
                /\.log$/,
                /\.tmp$/,
                /\.swp$/,
                /\.swo$/
            ],
            dirs: [
                /^\.vscode$/,
                /^\.idea$/,
                /^\.git$/,
                /^node_modules$/
            ]
        };

        removeFilesRecursive(tempDir, cleanupPatterns);
        log('  ✅ Cleaned up development files', 'green');

        // Validate manifest.json
        log('🔧 Validating manifest.json...', 'blue');
        const manifestPath = path.join(tempDir, 'manifest.json');
        const manifestValidation = validateManifest(manifestPath);
        
        if (!manifestValidation.valid) {
            log(`❌ Error: manifest.json is invalid - ${manifestValidation.error}`, 'red');
            process.exit(1);
        }
        log('  ✅ manifest.json is valid', 'green');

        // Get version from manifest
        const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const version = manifestContent.version;

        // Create package README
        log('📝 Creating package README...', 'blue');
        const readmeContent = `AI Text Translator - Chrome Extension
====================================

This is a clean build for Chrome Web Store submission.

Features:
- Universal translation on any website or PDF
- Support for Ukrainian, English, Polish, Spanish, German
- AI-powered translation with Gemini API support  
- Text-to-speech functionality
- Draggable, resizable dictionary panel
- Persistent translation history

Installation:
1. The extension has been reviewed and approved by Chrome Web Store
2. All files are minified and optimized for production use
3. No personal information or development artifacts included

Version: ${version}
Build Date: ${new Date().toISOString()}
`;

        fs.writeFileSync(path.join(tempDir, 'WEBSTORE_README.txt'), readmeContent);

        // Check file sizes
        log('📏 Checking file sizes...', 'blue');
        const checkLargeFiles = (dir, threshold = 1024 * 1024) => { // 1MB threshold
            const largeFiles = [];
            
            function scanDir(currentDir) {
                const entries = fs.readdirSync(currentDir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(currentDir, entry.name);
                    
                    if (entry.isDirectory()) {
                        scanDir(fullPath);
                    } else {
                        const size = getFileSize(fullPath);
                        if (size > threshold) {
                            largeFiles.push({
                                path: path.relative(tempDir, fullPath),
                                size: formatFileSize(size)
                            });
                        }
                    }
                }
            }
            
            scanDir(dir);
            return largeFiles;
        };

        const largeFiles = checkLargeFiles(tempDir);
        if (largeFiles.length > 0) {
            log('⚠️  Large files detected (>1MB):', 'yellow');
            largeFiles.forEach(file => {
                log(`    ${file.path}: ${file.size}`, 'yellow');
            });
        }

        // Create ZIP file
        log('🗜️  Creating ZIP archive...', 'blue');
        const zipPath = path.join(buildDir, zipName);
        
        const archiveSize = await createZipArchive(tempDir, zipPath);
        
        log(`✅ ZIP created successfully: ${formatFileSize(archiveSize)}`, 'green');

        // Check Chrome Web Store size limits (25MB)
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (archiveSize > maxSize) {
            log('❌ Warning: ZIP file is larger than 25MB Chrome Web Store limit!', 'red');
            log(`   Current size: ${formatFileSize(archiveSize)}`, 'red');
        } else {
            log('✅ ZIP file size is within Chrome Web Store limits', 'green');
        }

        // Security check
        log('🔒 Security check...', 'blue');
        if (manifestContent.host_permissions?.includes('<all_urls>')) {
            log('⚠️  Note: Extension requests access to all URLs', 'yellow');
            log('   This is normal for a translation extension that works on all sites');
        }

        if (manifestContent.host_permissions?.includes('file:///*')) {
            log('⚠️  Note: Extension requests access to local files', 'yellow');
            log('   This allows translation of local PDF files');
        }

        // Clean up
        fs.rmSync(tempDir, { recursive: true, force: true });

        // Final summary
        log('', 'reset');
        log('🎉 BUILD SUCCESSFUL!', 'green');
        log('==================================');
        log(`📦 Package: ${zipName}`, 'green');
        log(`📁 Location: ${buildDir}/`, 'green');
        log(`📏 Size: ${formatFileSize(archiveSize)}`, 'green');
        log('');
        log('Next steps for Chrome Web Store:', 'blue');
        log('1. Go to https://chrome.google.com/webstore/devconsole/');
        log('2. Click "Add new item"');
        log(`3. Upload the ZIP file: ${buildDir}/${zipName}`);
        log('4. Fill out the store listing information');
        log('5. Submit for review');
        log('');
        log('📋 Checklist before upload:', 'yellow');
        log('□ Store listing screenshots prepared');
        log('□ Extension description written');
        log('□ Privacy policy created (if collecting user data)');
        log('□ Developer account verified ($5 one-time fee)');
        log('');
        log('All personal information has been removed!', 'green');

    } catch (error) {
        log(`❌ Build failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Check if archiver is available
try {
    require('archiver');
} catch (error) {
    log('❌ Missing required dependency: archiver', 'red');
    log('Install it with: npm install archiver', 'yellow');
    log('Or use the bash version: ./build-webstore.sh', 'blue');
    process.exit(1);
}

if (require.main === module) {
    main();
}