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

### Server (Backend)
- Node.js
- Express.js
- Google Generative AI (Gemini 1.5)
- CORS for cross-origin resource sharing

## Installation

### Prerequisites
- Node.js (v12 or higher)
- npm or yarn
- Expo CLI
- Google Gemini API key

### Frontend Setup
1. Clone the repository
2. Navigate to the BillSplitter directory:
```bash
cd BillSplitter
```
3. Install dependencies:
```bash
npm install
```
4. Create a `.env` file in the root directory and add your configuration

### Backend Setup
1. Navigate to the server directory:
```bash
cd server
```
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file in the server directory and add:
```
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
```

## Running the Application

### Start the Backend Server
1. Navigate to the server directory:
```bash
cd server
```
2. Run the development server:
```bash
npm run dev
```
The server will start on port 3001 by default.

### Start the Frontend Application
1. Navigate to the BillSplitter directory:
```bash
cd BillSplitter
```
2. Start the Expo development server:
```bash
npm start
```
3. Use the Expo Go app on your mobile device to scan the QR code, or run on an emulator using the appropriate command:
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

- The backend uses the Gemini 1.5 model for optimal receipt processing
- The server includes detailed request logging for debugging
- CORS is configured to allow cross-origin requests
- The application supports both development and production environments
