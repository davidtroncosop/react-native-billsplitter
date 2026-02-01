import { GoogleGenerativeAI } from "@google/generative-ai";

// CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Allowed origins for production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:19006',
  'https://react-native-billsplitter-production.up.railway.app',
  'http://react-native-billsplitter-production.up.railway.app',
];

function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin');

  if (env.ENVIRONMENT === 'production' && origin && !allowedOrigins.includes(origin) && !env.CLIENT_URL?.includes(origin)) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': 'null',
    };
  }

  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin || '*',
  };
}

// Utility functions
const cleanJsonText = (text) => {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
};

const validateJsonStructure = (data) => {
  if (!data.items || !Array.isArray(data.items) || !data.total) {
    throw new Error('Invalid JSON structure: missing required fields');
  }

  data.items.forEach((item, index) => {
    if (!item.name || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
      throw new Error(`Invalid item structure at index ${index}`);
    }
  });

  if (typeof data.total !== 'number') {
    throw new Error('Invalid total value');
  }

  return true;
};

// Main request handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeadersForRequest = getCorsHeaders(request, env);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeadersForRequest,
      });
    }

    try {
      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          environment: env.ENVIRONMENT || 'development',
          geminiKey: env.GEMINI_API_KEY ? 'configured' : 'not configured',
          geminiModel: env.GEMINI_MODEL || 'gemini-1.5-flash'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeadersForRequest,
          },
        });
      }

      // Process receipt endpoint
      if (url.pathname === '/api/process-receipt' && request.method === 'POST') {
        return await handleProcessReceipt(request, env, corsHeadersForRequest);
      }

      // 404 for other routes
      return new Response(JSON.stringify({
        success: false,
        message: `Route ${url.pathname} not found`
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeadersForRequest,
        },
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeadersForRequest,
        },
      });
    }
  },
};

async function handleProcessReceipt(request, env, corsHeaders) {
  try {
    console.log('=== Starting Receipt Processing ===');

    const GEMINI_API_KEY = env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const body = await request.json();
    const { imageData, mimeType = "image/jpeg" } = body;

    // Validation
    if (!imageData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No image data provided',
        details: 'The request must include base64 encoded image data'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Process base64 data
    const base64Data = imageData.includes('base64,')
      ? imageData.split('base64,')[1]
      : imageData;

    // Check size (4MB limit)
    const sizeInMB = (base64Data.length * 3 / 4) / (1024 * 1024);
    console.log(`Image size: ${sizeInMB.toFixed(2)} MB`);

    if (sizeInMB > 4) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Image too large',
        details: `Image size (${sizeInMB.toFixed(2)}MB) exceeds 4MB limit`
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    console.log('Creating Gemini model instance...');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const modelName = env.GEMINI_MODEL || "gemini-3-flash-preview"; // Configurable model
    console.log(`Using Gemini model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

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
       - Convierte el precio a un número decimal usando el punto como separador decimal. 
       - **Si la boleta muestra algo como "3 Schop Heineken 500 14.700", asume que 14.700 es el total de esos 3 artículos.**  
       - **Primero conviértelo a 14700.00 (quitando el punto de miles). Luego divide entre la cantidad para obtener el precio unitario.**  
       - price = 14700.00 / 3 = 4900.00
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
      throw new Error('No response received from Gemini API');
    }

    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    console.log('Raw response from Gemini:', text);

    const cleanedText = cleanJsonText(text);
    console.log('Cleaned text:', cleanedText);

    try {
      const extractedData = JSON.parse(cleanedText);
      validateJsonStructure(extractedData);

      console.log('Successfully processed receipt:', extractedData);

      return new Response(JSON.stringify({
        success: true,
        data: extractedData,
        debug: {
          imageSize: `${sizeInMB.toFixed(2)}MB`,
          processingTime: new Date().toISOString()
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

    } catch (parseError) {
      console.error('JSON parsing error:', parseError);

      // Recovery attempt
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedData = JSON.parse(jsonMatch[0]);
          if (validateJsonStructure(extractedData)) {
            console.log('Successfully recovered and parsed data:', extractedData);
            return new Response(JSON.stringify({
              success: true,
              data: extractedData,
              recovered: true
            }), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            });
          }
        } catch (recoveryError) {
          console.error('Recovery attempt failed:', recoveryError);
        }
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to parse receipt data',
        details: parseError.message,
        rawResponse: cleanedText
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

  } catch (error) {
    console.error('Fatal error in receipt processing:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Receipt processing failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}