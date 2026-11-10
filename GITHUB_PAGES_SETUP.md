# GitHub Pages Deployment Guide

This guide will help you deploy the EFC Cube website to GitHub Pages.

## Prerequisites

- A GitHub account
- Git installed on your computer
- The EFC Cube project files

## Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name your repository (e.g., `efc-cube` or `eugene-fight-club`)
5. Choose **Public** (required for free GitHub Pages)
6. **Do NOT** initialize with README, .gitignore, or license (we already have these)
7. Click "Create repository"

## Step 2: Initialize Git and Push to GitHub

Open a terminal in the EFC_cube directory and run:

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: EFC Cube website"

# Add your GitHub repository as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** (top menu)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**
6. GitHub will provide you with a URL like: `https://YOUR_USERNAME.github.io/REPO_NAME/`

## Step 4: Wait for Deployment

- GitHub Pages typically takes 1-2 minutes to deploy
- You'll see a green checkmark next to your commit when it's ready
- Visit your site URL to verify it's working

## Step 5: Update Repository Settings (Optional)

If your repository name doesn't match your desired URL, you can:
1. Go to Settings → General
2. Scroll to "Repository name"
3. Rename it (this will change your GitHub Pages URL)

## Custom Domain (Optional)

If you have a custom domain:

1. Create a file named `CNAME` in the root directory with your domain:
   ```
   yourdomain.com
   ```
2. Add the file to git:
   ```bash
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```
3. Configure DNS settings with your domain provider:
   - Add a CNAME record pointing to `YOUR_USERNAME.github.io`
   - Or add A records for GitHub Pages IPs (see GitHub Pages docs)

## Updating Your Site

Whenever you make changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

GitHub Pages will automatically rebuild and deploy your changes (usually within 1-2 minutes).

## Troubleshooting

### Site Not Loading

1. Check that GitHub Pages is enabled in Settings → Pages
2. Verify the branch is set to `main` and folder is `/ (root)`
3. Check the Actions tab for any build errors
4. Wait a few minutes - first deployment can take longer

### Images/Audio Not Loading

1. Ensure all file paths are relative (they should be, e.g., `images/photo.jpg`)
2. Check file names match exactly (case-sensitive on GitHub)
3. Verify files are committed to the repository

### 404 Errors

- The `404.html` file will be used for any missing pages
- Make sure `index.html` is in the root directory

## File Structure for GitHub Pages

Your repository should look like this:

```
efc-cube/
├── .gitignore
├── 404.html
├── index.html
├── README.md
├── GITHUB_PAGES_SETUP.md
├── images/
│   ├── *.jpeg
│   ├── *.jpg
│   └── *.png
└── songs/
    └── *.mp3
```

## Important Notes

- **File Size Limits**: GitHub has a 100MB file size limit per file. Large audio/video files may need to be hosted elsewhere
- **Bandwidth**: GitHub Pages is free but has bandwidth limits for very high traffic
- **HTTPS**: All GitHub Pages sites use HTTPS automatically
- **Jekyll**: GitHub Pages uses Jekyll by default, but static HTML files work fine

## Next Steps

- Share your GitHub Pages URL with your audience
- Consider adding analytics (Google Analytics, etc.)
- Update social media links with your new URL
- Set up a custom domain if desired

## Support

For GitHub Pages documentation, visit: https://docs.github.com/pages

For issues with this project, check the README.md file.
