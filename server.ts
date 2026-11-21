import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/analyze', async (req: Request, res: Response) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'No se encontró una clave válida de GEMINI_API_KEY en el servidor. Verifica la configuración de secretos.',
        });
        return;
      }

      const summary = req.body?.summary;
      if (!summary || typeof summary !== 'object') {
        res.status(400).json({
          error: 'Se requiere el resumen estadístico del dataset para generar el análisis.',
        });
        return;
      }

      const systemInstruction = `Eres un analista de datos experto con amplia experiencia comunicando hallazgos estadísticos a usuarios que no son programadores.
Tu tarea es redactar un informe de análisis exploratorio de datos (EDA) en español claro, preciso, profesional y fácil de entender, basándote ÚNICAMENTE en el resumen estadístico proporcionado (nunca inventes cifras que no estén en el resumen).
Redacta exactamente las 6 secciones solicitadas con títulos descriptivos y viñetas concretas que citen nombres de variables y valores reales del resumen.`;

      const prompt = `Analiza el siguiente resumen estadístico de un dataset llamado "${summary.fileName || 'dataset'}" y genera un análisis completo en español estructurado en las 6 secciones requeridas:
a) Resumen general del dataset.
b) Calidad de los datos (datos faltantes, valores atípicos, filas duplicadas y posibles errores de registro).
c) Principales tendencias y patrones observados en las distribuciones y frecuencias.
d) Relaciones relevantes entre variables (correlaciones fuertes positivas o negativas).
e) Conclusiones clave.
f) Recomendaciones prácticas para análisis posteriores o toma de decisiones.

Resumen del dataset (JSON):
${JSON.stringify(summary, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resumenGeneral: {
                type: Type.OBJECT,
                properties: {
                  titulo: { type: Type.STRING },
                  parrafos: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  puntosClave: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['titulo', 'parrafos', 'puntosClave'],
              },
              calidadDatos: {
                type: Type.OBJECT,
                properties: {
                  titulo: { type: Type.STRING },
                  evaluacion: { type: Type.STRING },
                  puntos: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['titulo', 'evaluacion', 'puntos'],
              },
              tendenciasPatrones: {
                type: Type.OBJECT,
                properties: {
                  titulo: { type: Type.STRING },
                  puntos: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['titulo', 'puntos'],
              },
              relacionesVariables: {
                type: Type.OBJECT,
                properties: {
                  titulo: { type: Type.STRING },
                  puntos: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['titulo', 'puntos'],
              },
              conclusionesClave: {
                type: Type.OBJECT,
                properties: {
                  titulo: { type: Type.STRING },
                  puntos: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['titulo', 'puntos'],
              },
              recomendaciones: {
                type: Type.OBJECT,
                properties: {
                  titulo: { type: Type.STRING },
                  puntos: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['titulo', 'puntos'],
              },
            },
            required: [
              'resumenGeneral',
              'calidadDatos',
              'tendenciasPatrones',
              'relacionesVariables',
              'conclusionesClave',
              'recomendaciones',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'El modelo devolvió una respuesta vacía. Intenta regenerar el análisis.',
        });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({ analysis: parsed });
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      const status = typeof errorObj?.status === 'number' ? errorObj.status : 500;
      let friendlyMessage =
        'Ocurrió un error al comunicarse con Gemini IA para generar el análisis.';

      if (status === 403 || status === 401) {
        friendlyMessage =
          'La clave de API de Gemini no tiene permisos suficientes o es inválida. Verifica la configuración en Settings > Secrets.';
      } else if (status === 429) {
        friendlyMessage =
          'Se alcanzó temporalmente el límite de solicitudes de Gemini. Espera unos segundos e intenta de nuevo.';
      } else if (errorObj?.message) {
        friendlyMessage = `Error al generar análisis: ${errorObj.message}`;
      }

      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: friendlyMessage,
      });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Explorador de Datos activo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
