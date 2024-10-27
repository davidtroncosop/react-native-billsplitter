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

// Función para limpiar el texto JSON
const cleanJsonText = (text) => {
  // Eliminar los marcadores de código markdown y caracteres especiales
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/[\u201C\u201D]/g, '"') // Reemplazar comillas tipográficas
    .replace(/[\u2018\u2019]/g, "'") // Reemplazar comillas simples tipográficas
    .trim();
};

router.post('/process-receipt', async (req, res) => {
  try {
    console.log('Receipt processing request received');
    const { imageData, mimeType = "image/jpeg" } = req.body;
    
    if (!imageData) {
      console.error('No image data received');
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
          data: imageData,
          mimeType: mimeType
        }
      }
    ];

    try {
      console.log('Sending request to Gemini API');
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }]
      });

      console.log('Received response from Gemini API');
      const response = await result.response;
      const text = response.text();
      console.log('Raw response:', text);

      // Limpiar el texto antes de parsearlo
      const cleanedText = cleanJsonText(text);
      console.log('Cleaned text:', cleanedText);

      try {
        const extractedData = JSON.parse(cleanedText);
        
        // Validación adicional de la estructura del JSON
        if (!extractedData.items || !Array.isArray(extractedData.items) || !extractedData.total) {
          throw new Error('Invalid JSON structure');
        }

        // Validación de cada item
        extractedData.items.forEach(item => {
          if (!item.name || typeof item.quantity !== 'number' || !item.price) {
            throw new Error('Invalid item structure');
          }
        });

        console.log('Successfully parsed and validated data:', extractedData);
        res.json({ success: true, data: extractedData });
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Cleaned text:', cleanedText);
        
        // Intento de recuperación si el JSON está incompleto
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extractedData = JSON.parse(jsonMatch[0]);
            console.log('Successfully parsed data after recovery:', extractedData);
            res.json({ success: true, data: extractedData });
            return;
          } catch (recoveryError) {
            console.error('Recovery parse error:', recoveryError);
          }
        }

        res.status(500).json({ 
          success: false, 
          error: 'Failed to parse JSON from response', 
          raw: cleanedText 
        });
      }
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError);
      res.status(500).json({ 
        success: false, 
        error: geminiError.message,
        details: 'Error communicating with Gemini API'
      });
    }

  } catch (error) {
    console.error('Error processing receipt:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'General error in receipt processing'
    });
  }
});

export default router;
