import express from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Validación inicial de API key
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Función para limpiar el texto JSON
const cleanJsonText = (text) => {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
};

// Función para validar la estructura del JSON
const validateJsonStructure = (data) => {
  if (!data.items || !Array.isArray(data.items) || !data.total) {
    throw new Error('Invalid JSON structure: missing required fields');
  }

  data.items.forEach((item, index) => {
    if (!item.name || typeof item.quantity !== 'number' || !item.price) {
      throw new Error(`Invalid item structure at index ${index}`);
    }
  });

  return true;
};

router.post('/process-receipt', async (req, res) => {
  try {
    console.log('=== Starting Receipt Processing ===');
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);

    const { imageData, mimeType = "image/jpeg" } = req.body;
    
    // Validación de datos de entrada
    if (!imageData) {
      console.error('No image data received');
      return res.status(400).json({ 
        success: false, 
        error: 'No image data provided',
        details: 'The request must include base64 encoded image data'
      });
    }

    // Verificar el formato del base64
    if (!imageData.startsWith('data:image') && !imageData.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/)) {
      console.error('Invalid base64 format');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid image data format',
        details: 'The image data must be properly base64 encoded'
      });
    }

    // Procesar el base64 para remover el prefijo si existe
    const base64Data = imageData.includes('base64,') 
      ? imageData.split('base64,')[1] 
      : imageData;

    // Verificar tamaño
    const sizeInMB = (base64Data.length * 3/4) / (1024*1024);
    console.log(`Image size: ${sizeInMB.toFixed(2)} MB`);
    
    if (sizeInMB > 4) {
      return res.status(400).json({
        success: false,
        error: 'Image too large',
        details: `Image size (${sizeInMB.toFixed(2)}MB) exceeds 4MB limit`
      });
    }

    console.log('Creating Gemini model instance...');
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const prompt = `
You are a receipt analysis expert. Please analyze this receipt image carefully and extract the following information:
- All individual items with their exact names as shown
- The precise quantity of each item
- The exact price for each item
- The total amount of the receipt

Important rules:
1. Extract prices exactly as they appear, including currency symbols
2. Keep item names exactly as written on the receipt
3. Include all items, even if unclear
4. Maintain exact quantities as shown
5. Preserve the exact total amount

Return the data in this exact JSON structure:
{
  "items": [
    {
      "name": "string",
      "quantity": number,
      "price": "string"
    }
  ],
  "total": "string"
}

Only return the JSON object, no additional text or explanations.`;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ];

    console.log('Sending request to Gemini API...');
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }]
    });

    if (!result) {
      console.error('No response received from Gemini API');
      throw new Error('No response received from Gemini API');
    }

    const response = await result.response;
    const text = response.text();

    if (!text) {
      console.error('Empty response from Gemini API');
      throw new Error('Empty response from Gemini API');
    }

    console.log('Raw response from Gemini:', text);

    const cleanedText = cleanJsonText(text);
    console.log('Cleaned text:', cleanedText);

    try {
      const extractedData = JSON.parse(cleanedText);
      validateJsonStructure(extractedData);
      
      console.log('Successfully processed receipt:', extractedData);
      res.json({ 
        success: true, 
        data: extractedData,
        debug: {
          imageSize: `${sizeInMB.toFixed(2)}MB`,
          processingTime: new Date().toISOString()
        }
      });
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      
      // Intento de recuperación
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedData = JSON.parse(jsonMatch[0]);
          if (validateJsonStructure(extractedData)) {
            console.log('Successfully recovered and parsed data:', extractedData);
            res.json({ 
              success: true, 
              data: extractedData,
              recovered: true
            });
            return;
          }
        } catch (recoveryError) {
          console.error('Recovery attempt failed:', recoveryError);
        }
      }

      res.status(500).json({ 
        success: false, 
        error: 'Failed to parse receipt data',
        details: parseError.message,
        rawResponse: cleanedText
      });
    }

  } catch (error) {
    console.error('Fatal error in receipt processing:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      error: 'Receipt processing failed',
      details: error.message,
      timestamp: new Date().toISOString(),
      geminiConfigured: !!GEMINI_API_KEY
    });
  }
});

export default router;
