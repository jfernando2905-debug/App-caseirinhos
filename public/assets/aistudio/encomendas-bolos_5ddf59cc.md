# 🎂 App de Encomendas e Receitas de Bolo

App simples para controlar encomendas de bolos e guardar receitas, usado direto no celular e sempre atualizado.

- **Link:** https://claude.ai/artifact/8mWJMTYVptdyAvRxdXU3My
- **Formato:** página HTML única (`encomendas-bolos.html`), publicada como artefato do Claude
- **Idioma:** português (pt-BR)

---

## Funcionalidades

### Encomendas
- Cadastro com cliente, telefone/WhatsApp, data e horário de entrega, valor, sinal pago, status e observações
- **Vários bolos na mesma encomenda:** cada bolo tem tipo, tamanho, sabor e quantidade (botões "+ Adicionar outro bolo" e "Remover")
- Status: `pendente`, `pronto`, `entregue`
- Lista ordenada pela data de entrega, com filtros **Abertas / Entregues / Todas**
- Resumo no topo: em aberto, para hoje e atrasadas
- Ações em cada encomenda: Editar, Enviar WhatsApp, PDF, Marcar pronto, Entregue, Excluir (com segundo toque para confirmar)

### Receitas
- Nome, rendimento, ingredientes e modo de preparo
- Lista em ordem alfabética, com a receita completa expansível

### Compartilhamento
- **WhatsApp:** monta um texto organizado da encomenda e abre o WhatsApp (se o celular bloquear, copia o texto)
- **PDF:** gera um PDF em formato A5 com os dados da encomenda (cliente, entrega, bolos, valor, sinal, restante, status e observações); o celular pede confirmação antes de salvar

---

## Listas pré-cadastradas

| Campo | Opções |
|---|---|
| Tipo de bolo | Bolo de aniversário, Bolo de casamento, Bolo no pote, Bolo caseiro, Naked cake, Cupcakes, Outro |
| Tamanho | Único, Mini, Pequeno, Médio, Grande, Extra grande (sem medidas em cm, por enquanto) |
| Sabor | Fubá, Fubá com goiabada, Milho, Milho com requeijão, Cuca de banana, Cenoura, Outro (campo livre) |

---

## Como os dados são guardados

Os dados ficam no banco de dados do próprio artefato (capacidade `db`), em duas coleções:

**`orders`**
```json
{
  "cliente": "Ana",
  "telefone": "(41) 99999-0000",
  "entrega": "2026-10-05",
  "hora": "15:00",
  "valor": 120,
  "sinal": 50,
  "status": "pendente",
  "obs": "Escrever 'Parabéns'",
  "itens": [
    { "tipo": "Bolo caseiro", "tamanho": "Médio", "sabor": "Fubá", "qtd": 1 },
    { "tipo": "Bolo caseiro", "tamanho": "Único", "sabor": "Cenoura", "qtd": 2 }
  ]
}
```

**`recipes`**
```json
{ "nome": "Bolo de fubá", "rendimento": "1 forma", "ingredientes": "...", "preparo": "..." }
```

Encomendas antigas, com um bolo só nos campos `tipo`, `tamanho` e `sabor`, continuam sendo lidas normalmente.

---

## Tecnologia

- HTML, CSS e JavaScript puro, em um único arquivo, pensado para celular (mobile first) com modo claro e escuro
- Banco de dados: capacidade `db` do artefato, com atualização ao vivo entre aparelhos
- PDF: biblioteca jsPDF 2.5.1 (cdnjs) e capacidade `downloads` para salvar o arquivo
- Capacidades declaradas na publicação: `{"db": {}, "downloads": true}`

---

## Como compartilhar

| Forma | Resultado |
|---|---|
| Enviar o **link do artefato** para alguém com acesso de edição | Os dados são os mesmos nos dois aparelhos, atualizados na hora |
| Enviar o **arquivo HTML** solto | Cada aparelho fica com dados separados, sem sincronizar |
| **WhatsApp ou PDF** de cada encomenda | Quem recebe vê o pedido em texto ou arquivo, mas não é registrado no app dela |

Plano de uso combinado: um grupo de WhatsApp entre as duas pessoas, onde as encomendas são enviadas pelo botão do app.

---

## Limitações

- O app depende da plataforma Claude para abrir e guardar dados; não funciona de forma independente
- Para um app próprio, com endereço próprio e sincronização, seria preciso uma versão separada com banco na nuvem (por exemplo Firebase ou Supabase) e hospedagem (Vercel ou Netlify)
- O PDF usa fonte padrão e não aceita emojis

---

## Histórico de versões

1. Versão inicial: encomendas e receitas com sincronização
2. Tamanhos sem centímetros, com a opção "Único"; sabores pré-cadastrados
3. Correção da lista de tipos de bolo
4. Botão de envio por WhatsApp
5. Vários bolos por encomenda e PDF da encomenda; avisos na tela no lugar de `alert`, confirmação de exclusão em dois toques e indicador de versão no título

---

## Ideias para o futuro

- Total de vendas do mês
- Endereço de entrega
- Medidas em centímetros nos tamanhos
- Versão independente do Claude, com banco próprio
