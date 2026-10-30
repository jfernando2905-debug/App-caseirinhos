import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  // Shared Gemini client instance (server-side only)
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // API Route: AI-powered recipe text parser
  app.post('/api/parse-recipe', async (req, res) => {
    try {
      const { text, existingIngredients = [] } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Texto da receita não informado.' });
      }

      if (!ai) {
        return res.status(503).json({
          error: 'Chave Gemini não configurada no servidor. Usando analisador local integrado.',
          fallback: true,
        });
      }

      const prompt = `Você é um confeiteiro especialista e analista de ficha técnica para cálculo de custos.
Analise a receita abaixo e extraia as informações em formato JSON.

REQUISITO PRINCIPAL - BUSCA E REAPROVEITAMENTO DOS INGREDIENTES JÁ CADASTRADOS (NÃO DUPLICAR):
O confeiteiro já possui estes ingredientes cadastrados com custos calculados:
${JSON.stringify(existingIngredients.map((i: any) => ({ id: i.id, name: i.name, unit: i.unit })))}

Para CADA ingrediente mencionado na receita:
1. BUSCA OBRIGATÓRIA NO CADASTRO: Busque ativamente na lista de ingredientes cadastrados acima se já existe o mesmo ingrediente ou correspondente similar.
   Considere sinônimos, marcas, variações de singular/plural e termos equivalentes:
   - "3 ovos", "claras", "gemas" -> vincule ao ingrediente cadastrado "Ovo", "Ovos", "Ovo Branco" etc. (use a unidade "un").
   - "farinha de trigo", "trigo", "farinha" -> vincule a "Farinha de Trigo", "Farinha Especial", etc. (use unidade "g").
   - "açúcar refinado", "açúcar cristal", "açúcar" -> vincule ao tipo de açúcar cadastrado (use unidade "g").
   - "leite", "leite integral" -> vincule ao leite cadastrado (use unidade "ml").
   - "manteiga", "margarina" -> se houver manteiga ou margarina cadastrada, vincule.
   - "fermento em pó", "fermento químico" -> vincule ao fermento cadastrado.
   - "cacau em pó", "chocolate em pó", "nescau" -> vincule ao correspondente cadastrado.
   - "leite condensado", "creme de leite", "óleo" -> vincule ao correspondente cadastrado.

2. QUANDO ENCONTRAR CORRESPONDÊNCIA NA LISTA DE CADASTRADOS:
   - "id": OBRIGATORIAMENTE preencha com o "id" do ingrediente existente.
   - "nome": OBRIGATORIAMENTE use o NOME EXATO do ingrediente cadastrado.
   - "unidade": use a unidade cadastrada ("g", "ml" ou "un") e converta a quantidade ("qtd") para essa unidade.

3. SOMENTE SE FOR UM INGREDIENTE TOTALMENTE INÉDITO (sem similar na lista):
   - "id": null
   - "nome": nome padronizado no singular (ex: "Noz-moscada", "Canela em pó").
   - "unidade": "g", "ml" ou "un".

4. CONVERSÕES OBRIGATÓRIAS de medidas caseiras:
   - 1 xícara de farinha de trigo ≈ 120 g
   - 1 xícara de açúcar ≈ 180 g
   - 1 xícara de líquidos (óleo, leite, água, suco) ≈ 240 ml
   - 1 xícara de chocolate em pó / cacau ≈ 90 g
   - 1 xícara de amido de milho ≈ 100 g
   - 1 xícara de fubá ≈ 130 g
   - 1 colher de sopa de fermento ≈ 14 g
   - 1 colher de sopa de manteiga / margarina ≈ 15 g
   - 1 colher de sopa de açúcar ou farinha ≈ 15 g
   - 1 colher de sopa de líquido ≈ 15 ml
   - 1 colher de chá ≈ 5 g / 5 ml
   - 1 lata / caixa de leite condensado ≈ 395 g
   - 1 caixa de creme de leite ≈ 200 g
   - 1 vidro de leite de coco ≈ 200 ml
   - Ovos: sempre quantidade em unidades ("un")
   - kg convertidos para g (1 kg = 1000 g), L para ml (1 L = 1000 ml)

RECEITA:
${text}

Responda APENAS com JSON no formato:
{
  "nome": "string",
  "rendimento": 12,
  "tempo_min": 40,
  "temp": "180",
  "itens": [
    { "nome": "string", "qtd": 100, "unidade": "g", "id": "id_existente_ou_null" }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);
      return res.json(parsed);
    } catch (err: any) {
      console.error('Error parsing recipe with Gemini:', err);
      return res.status(500).json({
        error: 'Erro ao analisar receita com IA: ' + (err.message || 'Erro desconhecido'),
        fallback: true,
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, geminiConfigured: !!ai });
  });

  // Setup Vite dev server or production static serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Caseirinhos Fer&Dre server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
