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
    // Agregar conversión de números con punto como separador de miles
    .replace(/(\d)\.(\d{3})/g, '$1,$2')
    .trim();
};

// Función para validar la estructura del JSON
const validateJsonStructure = (data) => {
  if (!data.items || !Array.isArray(data.items) || !data.total || !data.currency) {
    throw new Error('Invalid JSON structure: missing required fields');
  }

  data.items.forEach((item, index) => {
    if (!item.name || typeof item.quantity !== 'number') {
      throw new Error(`Invalid item structure at index ${index}`);
    }
    
    // Convertir precio a número con dos decimales
    item.price = parseFloat(item.price.toString().replace(/,/g, ''));
  });

  // Convertir total
  data.total = parseFloat(data.total.toString().replace(/,/g, ''));

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
       - Convierte el precio a un número decimal usando el punto como separador decimal (sin comas para miles).
       - Elimina cualquier símbolo de moneda
       - REGLAS IMPORTANTES PARA PRECIOS:
         - Si ves un número como "3.700", debe convertirse a "3700.00"
         - Si ves un número como "24.990", debe convertirse a "24990.00"
         - El punto en estos casos NO es un separador decimal, sino un separador de miles que debe ser eliminado.
         - Solo cuando hay exactamente dos dígitos después del punto (como en "24.90"), el punto es realmente decimal
       - Ejemplos de conversión:
         - "3.700" → 3700.00 (punto se elimina, se agregan decimales)
         - "24.990" → 24990.00 (punto se elimina, se agregan decimales)
         - "5.400" → 5400.00 (punto se elimina, se agregan decimales)
         - "7.990" → 7990.00 (punto se elimina, se agregan decimales)
         - "3.50" → 3.50 (punto es decimal porque solo hay dos dígitos después)
         - "100" → 100.00 (agregar decimales)
    
    4. **Cálculo del Total:**
       - Identifica y extrae el monto total mostrado en el recibo
       - Convierte el total siguiendo las mismas reglas que los precios individuales
       - Elimina cualquier símbolo de moneda
    
    Formato de Salida:
    
    \`\`\`json
    {
      "items": [
        {
          "name": "string",
          "quantity": 1,
          "price": 0.00    // Número usando punto como separador decimal
        }
      ],
      "total": 0.00        // Número usando punto como separador decimal
    }
    \`\`\`
    
    Ejemplo de formato de salida correcto:
    {
      "items": [
        {
          "name": "Jugo Limonada",
          "quantity": 1,
          "price": 3700.00
        },
        {
          "name": "Papas Infarto",
          "quantity": 1,
          "price": 24990.00
        }
      ],
      "total": 28690.00
    }
    
    IMPORTANTE: 
    - Responde SOLO con el objeto JSON
    - Asegúrate de que todos los precios que terminen en tres ceros después del punto (ejemplo: "3.700") sean convertidos a formato sin coma y con dos decimales (ejemplo: "3700.00")`;
    
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