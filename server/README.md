# BillSplitter Server

Backend server for the BillSplitter application.

## Deployment Instructions for Railway

1. Create a new project in Railway
2. Connect your GitHub repository
3. Configure the following environment variables in Railway:
   - `NODE_ENV=production`
   - `PORT=3001` (Railway will automatically assign its own port)
   - `SERVER_URL` (Your Railway app URL, will be provided by Railway)
   - `CLIENT_URL` (Your frontend app URL)

### Manual Deployment Steps

1. Fork or clone this repository
2. Create a new project in Railway
3. Configure GitHub integration or use Railway CLI
4. Set up environment variables in Railway dashboard
5. Deploy the server directory

### Important Notes

- The server is configured to run in production mode on Railway
- CORS is configured to accept requests only from allowed origins
- Make sure to update the `CLIENT_URL` environment variable to match your frontend deployment URL
- The server will automatically use the PORT provided by Railway

### Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Production Build

For production deployment, Railway will automatically:
1. Install dependencies (`npm install`)
2. Start the server (`npm start`)

### Health Check

The server includes a health check endpoint at `/health` that can be used to verify the deployment:
```bash
curl https://your-railway-url.railway.app/health
```

### Troubleshooting

If you encounter deployment issues:

1. Verify environment variables are correctly set in Railway dashboard
2. Check Railway logs for any error messages
3. Ensure all dependencies are listed in package.json
4. Verify the start script is correctly defined in package.json
5. Check that the Node.js version specified in package.json matches Railway's requirements

For local development issues:
1. Ensure all environment variables are correctly set in .env
2. Check that all dependencies are installed (`npm install`)
3. Verify the correct Node.js version is installed (>=18.0.0)
