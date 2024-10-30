import express from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Function to clean JSON text
const cleanJsonText = (text) => {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
};

router.post('/process-receipt', async (req, res) => {
  try {
    console.log('Receipt processing request received');
    const { imageData, mimeType = "image/jpeg" } = req.body;
    
    if (!imageData) {
      console.error('No image data received');
      return res.status(400).json({ 
        success: false, 
        error: 'No image data provided',
        details: 'The request must include base64 encoded image data'
      });
    }

    const sizeInMB = (imageData.length * 3 / 4) / (1024 * 1024);
    console.log(`Image size: ${sizeInMB.toFixed(2)} MB`);

    if (sizeInMB > 4) {
      console.error('Image too large:', sizeInMB.toFixed(2), 'MB');
      return res.status(400).json({
        success: false,
        error: 'Image too large',
        details: 'Image must be less than 4MB'
      });
    }

    if (!imageData.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/)) {
      console.error('Invalid base64 format');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid image data format',
        details: 'The image data must be properly base64 encoded'
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    const prompt = `...`; // [Use the previous prompt string here]

    const imageParts = [
      {
        inlineData: {
          data: imageData,
          mimeType: mimeType
        }
      }
    ];

    try {
      console.log('Sending request to Gemini API');
      console.log('API Key length:', GEMINI_API_KEY.length, 'characters');
      console.log('First 5 chars of API Key:', GEMINI_API_KEY.substring(0, 5));
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }]
      });

      if (!result) {
        throw new Error('No response from Gemini API');
      }

      const response = await result.response;
      
      if (!response) {
        throw new Error('Empty response from Gemini API');
      }

      const text = response.text();
      console.log('Raw response:', text);

      if (!text) {
        throw new Error('Empty text from Gemini API response');
      }

      const cleanedText = cleanJsonText(text);
      console.log('Cleaned text:', cleanedText);

      try {
        const extractedData = JSON.parse(cleanedText);
        
        if (!extractedData.items || !Array.isArray(extractedData.items) || !extractedData.total) {
          throw new Error('Invalid JSON structure: missing required fields');
        }

        extractedData.items.forEach((item, index) => {
          if (!item.name || typeof item.quantity !== 'number' || !item.price) {
            throw new Error(`Invalid item structure at index ${index}`);
          }
        });

        console.log('Successfully parsed and validated data:', extractedData);
        res.json({ success: true, data: extractedData });
      } catch (parseError) {
        console.error('JSON parse error:', parseError.message);
        console.error('Cleaned text that failed to parse:', cleanedText);
        
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extractedData = JSON.parse(jsonMatch[0]);
            if (extractedData.items && Array.isArray(extractedData.items) && extractedData.total) {
              console.log('Successfully parsed data after recovery:', extractedData);
              res.json({ success: true, data: extractedData });
              return;
            }
          } catch (recoveryError) {
            console.error('Recovery parse error:', recoveryError.message);
          }
        }

        res.status(500).json({ 
          success: false, 
          error: 'Failed to parse receipt data', 
          details: parseError.message,
          raw: cleanedText 
        });
      }
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError.message);
      console.error('Full error object:', JSON.stringify(geminiError, null, 2));
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process receipt with AI',
        details: geminiError.message
      });
    }

  } catch (error) {
    console.error('Error processing receipt:', error.message);
    console.error('Full error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'General error in receipt processing',
      details: error.message
    });
  }
});

export default router;
