import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // CORS & headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const { text, existingIngredients = [] } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Texto da receita não informado.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Chave GEMINI_API_KEY não configurada no ambiente. Usando analisador local.',
        fallback: true,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Você é um confeiteiro e analista de receitas para cálculo de custos.
Analise o texto da receita abaixo e extraia os dados estritamente em formato JSON.

Lista de ingredientes já cadastrados no app:
${JSON.stringify(existingIngredients.map((i: any) => ({ id: i.id, name: i.name, unit: i.unit })))}

Regras essenciais:
1. "nome": nome do bolo ou da receita.
2. "rendimento": número de fatias ou porções estimadas (ex: 12). Se não especificado, use 12 ou 1.
3. "tempo_min": tempo de forno ou cozimento em minutos (número inteiro). Se houver faixa (ex: 40-50 min), use a média (45).
4. "temp": temperatura de forno em Celsius (ex: "180" ou "180-200").
5. "itens": array de ingredientes com:
   - "nome": nome padronizado do ingrediente (ex: "Farinha de trigo", "Açúcar cristal", "Ovos", "Manteiga", "Leite integral")
   - "qtd": quantidade numérica positiva
   - "unidade": SOMENTE "g", "ml" ou "un".
   - "id": id do ingrediente existente se corresponder a um da lista acima, ou null se for novo.
6. CONVERSÕES OBRIGATÓRIAS de medidas caseiras:
   - 1 xícara de farinha de trigo ≈ 120 g
   - 1 xícara de açúcar ≈ 180 g
   - 1 xícara de líquidos (óleo, leite, água, suco) ≈ 240 ml
   - 1 xícara de chocolate em pó / cacau ≈ 90 g
   - 1 xícara de amido de milho ≈ 100 g
   - 1 colher de sopa de fermento ≈ 15 g
   - 1 colher de sopa rasa de manteiga ≈ 15 g / cheia ≈ 20 g
   - 1 colher de sopa de líquido ≈ 15 ml
   - 1 colher de chá ≈ 5 g / 5 ml
   - 1 lata / caixa de leite condensado ≈ 395 g
   - 1 caixa de creme de leite ≈ 200 g
   - 1 vidro de leite de coco ≈ 200 ml
   - Ovos: sempre unidade ("un")
   - kg convertidos para g (1 kg = 1000 g), L convertidos para ml (1 L = 1000 ml)
7. Ignore ingredientes sem quantidade ou decorações opcionais genéricas se não puder quantificar.

RECEITA:
${text}

Responda APENAS com JSON no formato:
{
  "nome": "string",
  "rendimento": 12,
  "tempo_min": 40,
  "temp": "180",
  "itens": [
    { "nome": "string", "qtd": 100, "unidade": "g", "id": "id_ou_null" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = response.text || '{}';
    const parsed = JSON.parse(responseText);
    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('Error parsing recipe with Gemini in Vercel function:', err);
    return res.status(500).json({
      error: 'Erro ao analisar receita com IA: ' + (err.message || 'Erro desconhecido'),
      fallback: true,
    });
  }
}
