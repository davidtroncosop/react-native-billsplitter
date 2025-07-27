# BillSplitter

BillSplitter is a mobile application built with React Native that helps users split bills by scanning receipts. The app uses Google's Gemini AI to automatically extract items and prices from receipt images, making bill splitting easier and more accurate.

## Features

- 📸 Receipt scanning and image upload
- 🤖 AI-powered receipt text extraction using Google Gemini
- 📝 Manual bill editing capabilities
- 💰 Bill splitting functionality
- 📱 Cross-platform support (iOS and Android)

## Tech Stack

### Mobile App (Frontend)
- React Native with Expo
- TypeScript
- React Navigation for routing
- Expo Image Picker for image handling
- AsyncStorage for local data persistence
- Axios for API communication

### Backend API
- Cloudflare Workers (Serverless)
- Google Generative AI (Gemini 1.5)
- Edge computing for ultra-low latency

## Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Google Gemini API key
- Cloudflare account (free tier available)

### Frontend Setup
1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Update the API URL in `config.ts` with your Cloudflare Workers URL

### Backend Setup (Cloudflare Workers)
1. Navigate to the backend directory:
```bash
cd cloudflare-workers
```
2. Install Wrangler CLI:
```bash
npm install -g wrangler
```
3. Authenticate with Cloudflare:
```bash
wrangler login
```
4. Install dependencies:
```bash
npm install
```
5. Configure your Gemini API key:
```bash
wrangler secret put GEMINI_API_KEY
```
6. Deploy to Cloudflare Workers:
```bash
npm run deploy
```

For detailed setup instructions, see [CLOUDFLARE-SETUP.md](CLOUDFLARE-SETUP.md)

## Running the Application

### Start the Frontend Application
1. Start the Expo development server:
```bash
npm start
```
2. Use the Expo Go app on your mobile device to scan the QR code, or run on an emulator:
- For iOS: `npm run ios`
- For Android: `npm run android`

## API Endpoints

### POST /api/process-receipt
Processes a receipt image and returns extracted items and total.

**Request Body:**
```json
{
  "imageData": "base64_encoded_image",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "name": "string",
        "quantity": number,
        "price": "string"
      }
    ],
    "total": "string"
  }
}
```

## Application Flow

1. **Home Screen**: Starting point of the application where users can view their bills or start a new one
2. **Upload Screen**: Allows users to take a picture of a receipt or upload one from their gallery
3. **Edit Bill Screen**: Displays the AI-extracted items and allows for manual adjustments
4. **Split Bill Screen**: Enables users to split the bill among multiple people

## Error Handling

- The application includes comprehensive error handling for both frontend and backend operations
- Image processing errors are gracefully handled with user-friendly messages
- Network connectivity issues are properly managed
- Invalid data inputs are validated and appropriate feedback is provided

## Development Notes

- The backend uses Cloudflare Workers for serverless deployment
- The API uses the Gemini 1.5 model for optimal receipt processing
- Edge computing provides ultra-low latency globally
- CORS is configured to allow cross-origin requests
- The application supports both development and production environments

## Deployment

The backend is deployed on Cloudflare Workers, providing:
- ⚡ Ultra-low latency (edge computing)
- 🌍 Global distribution (200+ locations)
- 📈 Auto-scaling
- 💰 Cost-effective (generous free tier)
- 🔒 Built-in security and DDoS protection
