# 🎂 Custo de Receitas - Encomendas & Confeitaria Caseira

Uma aplicação web moderna, responsiva e completa para confeiteiras(os) e pequenos negócios de confeitaria calcularem com exatidão o custo real de produção, precificarem bolos e fatias com lucro garantido, gerenciarem encomendas e emitirem fichas técnicas em PDF.

---

## ✨ Funcionalidades Principais

1. **Calculadora Precisa de Custos:**
   - Custo exato de insumos por grama, mililitro e unidade.
   - Cálculo automático de consumo elétrico de fornos e batedeiras ($W \times \text{min} \times \text{R\$/kWh}$).
   - Cálculo de queima de gás (botijão 13kg ou encanado).
   - Inclusão de custo de embalagem, mão de obra e margem de lucro personalizada.

2. **Escalonamento Inteligente de Tamanhos:**
   - Configuração de múltiplos tamanhos (P, M, G, aro 15cm, aro 20cm, etc.).
   - Multiplicador de receita com cálculo automático de custos e preços sugeridos por tamanho.

3. **Gestão Completa de Encomendas:**
   - Controle de status: *Pendente*, *Pronto* e *Entregue*.
   - Cálculo de sinal/adiantamento e saldo restante a receber.
   - Compartilhamento de pedido diretamente pelo **WhatsApp** com mensagem pronta e profissional.
   - Exportação de **Comprovante do Pedido em PDF**.
   - Exportação de **Relatório Geral de Encomendas em PDF** com filtros por período ou status.

4. **Exportação de Ficha Técnica em PDF (A4):**
   - Download da Ficha de Produção completa com ingredientes, custos detalhados, tabela de tamanhos e modo de preparo.

5. **Gráfico de Lucro Acumulado (Recharts):**
   - Visualização gráfica de faturamento, custo e lucro total acumulado mês a mês das encomendas finalizadas.

6. **Importador Inteligente de Receitas:**
   - Cole receitas da internet com conversão automática de medidas caseiras (xícaras, colheres, latas).
   - Análise via Gemini AI (com analisador inteligente local integrado em caso de offline).

7. **Dark Mode & Design Responsivo:**
   - Alternância de tema Claro/Escuro no cabeçalho com persistência em `localStorage`.
   - Layout 100% responsivo para celular (com menu inferior tátil) e desktop.

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou bun

### Instalação
```bash
# Clone ou baixe o projeto
cd custo-de-receitas

# Instale as dependências
npm install

# Copie o arquivo de exemplo de variáveis de ambiente (opcional para IA)
cp .env.example .env

# Inicie o servidor de desenvolvimento
npm run dev
```
O app estará acessível em `http://localhost:3000`.

---

## 📦 Como Subir no GitHub

Siga este passo a passo no seu terminal dentro da pasta do projeto:

### 1. Inicie o repositório Git local
```bash
git init
```

### 2. Adicione todos os arquivos
```bash
git add .
```

### 3. Faça o primeiro commit
```bash
git commit -m "feat: versão inicial Custo de Receitas com gestão de encomendas, PDFs e Recharts"
```

### 4. Renomeie a branch para `main` (se necessário)
```bash
git branch -M main
```

### 5. Crie um repositório no seu GitHub
- Acesse [github.com/new](https://github.com/new).
- Escolha o nome do repositório (exemplo: `custo-de-receitas`).
- Deixe o repositório como **Public** ou **Private**.
- **Não** marque as opções de adicionar README ou .gitignore (eles já existem no projeto).
- Clique em **Create repository**.

### 6. Vincule o repositório remoto e faça o push
```bash
# Substitua SEU_USUARIO e SEU_REPOSITORIO pelos seus dados
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git

# Envie o código
git push -u origin main
```

---

## ⚡ Como Fazer Deploy na Vercel

O projeto já inclui o arquivo `vercel.json` e a pasta `api/` pré-configurados para a Vercel.

### Método 1: Pela Interface Web da Vercel (Recomendado)

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta do GitHub.
2. No painel, clique no botão **"Add New..."** > **"Project"**.
3. Localize o repositório `custo-de-receitas` que você acabou de subir no GitHub e clique em **"Import"**.
4. Nas configurações do projeto (**Configure Project**):
   - **Framework Preset**: Selecione `Vite`.
   - **Root Directory**: `./` (padrão).
   - **Build Command**: `vite build` (padrão).
   - **Output Directory**: `dist` (padrão).
5. *(Opcional)* Em **Environment Variables**, adicione se desejar usar a IA Gemini para colar receitas:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Sua chave de API do Google AI Studio (obtenha em [aistudio.google.com](https://aistudio.google.com/)).
   *(Se não adicionar a chave, o app continuará funcionando 100% com o analisador de receitas local integrado)*.
6. Clique em **"Deploy"**.
7. Em menos de 1 minuto, seu app estará no ar com link gratuito `https://custo-de-receitas.vercel.app`!

---

### Método 2: Pelo Terminal (Vercel CLI)

Se preferir usar o terminal:

```bash
# Instale a CLI da Vercel globalmente
npm i -g vercel

# Na raiz do projeto, execute
vercel

# Para deploy de produção
vercel --prod
```

---

## 🛠️ Tecnologias Utilizadas

- **React 19 & TypeScript**
- **Vite** para build ultrarrápido
- **Tailwind CSS v4** para estilização moderna e Dark Mode
- **jsPDF** para geração de Fichas Técnicas e Relatórios em PDF
- **Recharts** para gráficos de lucro acumulado e faturamento
- **Lucide Icons** para ícones de confeitaria e navegação
- **Google GenAI SDK** para análise inteligente de texto de receitas
- **Express / Vercel Serverless Functions** para API backend
