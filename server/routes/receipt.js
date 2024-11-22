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
  if (!data.items || !Array.isArray(data.items) || !data.total || !data.currency) {
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Eres un experto en reconocimiento óptico de caracteres (OCR) y extracción de datos de recibos. Tu tarea es analizar meticulosamente la imagen del recibo proporcionada y extraer con precisión toda la información relevante.

    Por favor, realiza lo siguiente:
    
    1. **Extracción de Artículos:** 
       - Identifica y lista cada artículo comprado
       - Transcribe los nombres de los artículos exactamente como aparecen en el recibo
       - Preserva todas las palabras, ortografía, abreviaturas y caracteres especiales
    
    2. **Determinación de Cantidad:**
       - Determina la cantidad exacta de cada artículo comprado
       - La cantidad debe ser un número
    
    3. **Extracción de Precios:**
       - Extrae el precio exacto de cada artículo
       - Convierte el precio a un número decimal
       - Elimina cualquier símbolo de moneda
       - REGLAS PARA SEPARADORES:
         - Si hay 3 dígitos después del separador (punto o coma), es una coma decimal
         - Si hay 2 dígitos después del separador (punto o coma), es un punto decimal
       - Ejemplos de conversión:
         - "1.234,567" → 1234.567 (3 dígitos → coma decimal)
         - "1,234.56" → 1234.56 (2 dígitos → punto decimal)
         - "100.567" → 100.567 (3 dígitos → punto es separador de miles)
         - "100,56" → 100.56 (2 dígitos → coma es decimal)
         - "1234.56" → 1234.56 (2 dígitos → punto decimal)
         - "1234,567" → 1234.567 (3 dígitos → coma decimal)
         - "100" → 100.00
    
    4. **Cálculo del Total:**
       - Identifica y extrae el monto total mostrado en el recibo
       - Convierte el total a un número decimal siguiendo las mismas reglas que los precios individuales
       - Elimina cualquier símbolo de moneda
    
    Formato de Salida:
    
    \`\`\`json
    {
      "items": [
        {
          "name": "string",
          "quantity": 1,
          "price": 0.00    // Número decimal
        }
      ],
      "total": 0.00        // Número decimal
    }
    \`\`\`
    
    Ejemplos de formato de salida:
    {
      "items": [
        {
          "name": "Café",
          "quantity": 2,
          "price": 3.567
        },
        {
          "name": "Croissant",
          "quantity": 1,
          "price": 2.75
        }
      ],
      "total": 9.884
    }
    
    IMPORTANTE: Responde SOLO con el objeto JSON. No incluyas texto adicional, explicaciones o elementos conversacionales.`;

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