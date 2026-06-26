# Deployment Guide: AgentRouter Chat SaaS Web Application

This guide contains step-by-step instructions to run, optimize, and deploy the AgentRouter Chat SaaS Web Application locally or to production environments like **Vercel**, **Netlify**, and **Hostinger**.

---

## 1. Core Architecture & Security Note
To ensure **100% security & user privacy**, this application is built as a client-side-first workspace. 
* All **AgentRouter API Keys are stored locally** in the user's browser via `localStorage` (encrypted via Zustand persist).
* API keys are **never sent to any intermediate server or backend database**; all requests are dispatched directly from the client browser to the AgentRouter endpoint (`https://agentrouter.org/v1`).
* As a result, this application can be compiled as a **fully static SPA (Single Page Application)**, making it highly secure, fast, and extremely cheap to host.

---

## 2. Local Setup & Development

### Prerequisites
* **Node.js** v18.18.0 or higher
* **npm** v10.0.0 or higher

### Installation Commands
Run the following commands in your terminal to install the project dependencies:
```bash
# Install package dependencies
npm install
```

### Run Locally
Launch the local development server:
```bash
# Starts the development server on http://localhost:3000
npm run dev
```

### Build Commands
Compile the application for production:
```bash
# Generates a highly optimized Next.js build
npm run build
```

---

## 3. Environment Variables (`.env`)
Since keys are inputted by users dynamically in the UI and saved in local storage, there are **no mandatory environment variables required to run or build the app**.

However, if you wish to pre-configure defaults for self-hosting or custom SaaS setups, you can create a `.env.local` file in the root:

```env
# Optional: Pre-fill a default API key (caution: visible to client-side JS)
NEXT_PUBLIC_DEFAULT_API_KEY=your-agentrouter-key-here

# Optional: Override default assistant system prompt
NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT="You are a custom corporate assistant..."
```

---

## 4. Vercel Deployment (Recommended)
Vercel is the native hosting platform for Next.js, offering zero-config deployments, automatic edge optimizations, and global CDNs.

### Steps:
1. **Push your code** to a GitHub, GitLab, or Bitbucket repository.
2. **Sign in to Vercel** (`https://vercel.com/`) and click **Add New > Project**.
3. **Import your repository**.
4. In the configuration panel:
   * **Framework Preset**: Next.js
   * **Root Directory**: `./` (Root)
   * **Build Command**: `npm run build`
   * **Output Directory**: `.next`
5. Click **Deploy**. Vercel will build the project, run TypeScript checks, and supply you with a production SSL URL in under 2 minutes.

---

## 5. Netlify Deployment
Netlify is excellent for hosting static web applications. You can deploy this app either as a Serverless Next.js app or as a static HTML export.

### Static HTML Export Setup (Best for Netlify CDN):
To enable pure static exports, edit the `next.config.ts` (or `next.config.mjs`) to include `output: 'export'`:

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Enables pure static HTML/CSS/JS export in the 'out/' directory
  images: {
    unoptimized: true, // Required for static exports
  },
};

export default nextConfig;
```

### Steps:
1. **Create a `netlify.toml`** file in the root of your project:
   ```toml
   [build]
     command = "npm run build"
     publish = "out"
   ```
2. **Link your repository** to Netlify.
3. Netlify will detect the `netlify.toml` configurations, build the project using `npm run build` (which writes to the `out/` folder due to `output: 'export'`), and serve the folder statically.

---

## 6. Hostinger Deployment
Hostinger offers two primary hosting tiers: **Shared Hosting** (static files only) and **VPS Hosting** (virtual private servers capable of running Node.js daemons).

### Option A: Hostinger Shared Hosting (Static HTML Export)
This is the easiest and most cost-effective hosting option.

1. **Configure Static Export**: Add `output: 'export'` to your `next.config.ts` file as shown in the Netlify section.
2. **Build Locally**: Run the build command:
   ```bash
   npm run build
   ```
   This will generate a folder named `out` in your project root containing pure HTML, CSS, JS, and asset files.
3. **Zip Output**: Compress the contents of the `out` folder into a `.zip` file (e.g., `out.zip`). Do not zip the folder itself, only its contents.
4. **Upload to Hostinger**:
   * Log in to your Hostinger hPanel.
   * Navigate to **File Manager** for your domain.
   * Access the `public_html` directory.
   * Upload `out.zip` and extract it directly inside `public_html`.
   * Delete the `out.zip` file. Your website is now live instantly!

---

### Option B: Hostinger VPS Hosting (Node.js Server Daemon)
If you want to run Next.js in Server SSR/Serverless mode to leverage features like API route proxies or dynamically compiled scripts.

1. **Prepare Server**: Ensure your Hostinger VPS is running Ubuntu (e.g., Ubuntu 22.04 LTS) and has **Node.js** and **Nginx** installed.
2. **Clone Code**: Clone your repository directly to `/var/www/agentrouter-chat` on the VPS.
3. **Install & Build**:
   ```bash
   cd /var/www/agentrouter-chat
   npm install
   npm run build
   ```
4. **Install PM2** (Process Manager) to keep your Node app running as a background daemon:
   ```bash
   sudo npm install -g pm2
   pm2 start npm --name "agentrouter-chat" -- start
   pm2 save
   pm2 startup
   ```
5. **Configure Nginx Reverse Proxy**:
   Create an Nginx configuration block for your domain:
   ```bash
   sudo nano /etc/nginx/sites-available/yourdomain.com
   ```
   Paste the following server block:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Enable the configuration and reload Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
6. **SSL Setup** (Let's Encrypt):
   Install Certbot and request an SSL certificate:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```
   Follow the prompts to enable automatic HTTPS redirection.

---

## 7. Production Optimization Steps
Before deploying to production, verify that you have implemented the following performance and SEO optimizations:

* **Image Optimization**: If you are using static export (`output: 'export'`), Next.js standard image optimization is disabled. Ensure all static icons, logos, and illustrations are optimized/compressed using formats like WebP or SVG.
* **Asset Compression**: Ensure your hosting provider (like Nginx on Hostinger VPS) has Gzip or Brotli compression enabled for HTML, CSS, and JS payloads to minimize load times.
* **Font Delivery**: Fonts are loaded locally using `next/font/google` in `layout.tsx`. This avoids layout shifts and external HTTP overhead, satisfying premium typography requirements.
* **Edge Routing**: If deploying on Vercel or Netlify, static pages are cached at edge networks globally, ensuring page load times under 200ms.
