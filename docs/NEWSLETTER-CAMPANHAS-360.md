# Newsletters 360 — preparação de lançamento

O módulo `/admin/newsletter` utiliza `newsletter_subscribers` e duas tabelas novas. Foi criada uma campanha de lançamento como rascunho, sem envio.

## Configuração necessária (Vercel, apenas servidor)
- `RESEND_API_KEY`: já existente. Não expor no browser.
- `RESEND_NEWSLETTER_SEGMENT_ID`: criar um segmento exclusivo da 360 em Resend e introduzir o seu ID.
- `RESEND_MARKETING_FROM_EMAIL`: remetente comercial verificado (por exemplo `360 Merchandising <info@360-merchandising.com>`).
- `RESEND_WEBHOOK_SECRET`: segredo de assinatura do webhook Resend (começa por `whsec_`).

O endpoint para cancelamentos é `POST /api/webhooks/resend-newsletter`. Configurar apenas o evento `contact.updated` no Resend, com assinatura Svix. O handler apenas grava cancelamentos; não reativa contactos.

## Regras de segurança
1. Só incluir no segmento contactos com consentimento comercial válido. Não sincronizar indiscriminadamente todos os utilizadores da loja.
2. Verificar a lista de supressão do Resend antes da primeira importação e antes de cada campanha. Um cancelamento nunca pode ser revertido por importação.
3. Separar segmento/identidade de marketing dos emails transacionais; preservar envios de confirmação e encomendas.
4. O botão “Preparar rascunho Resend” faz `POST /broadcasts` com `send: false`; não existem rotas de envio ou agendamento. Não efetuar envio manual até à validação de destinatários.
5. Se a criação de rascunho remoto tiver resultado incerto, a campanha fica `failed`, para reconciliação manual e sem repetir automaticamente o pedido.
6. Testar o fluxo de cancelamento, autenticação, assinatura inválida, reenvios e visualização em dispositivos diferentes.
7. O módulo armazena apenas texto e cria HTML através de escape. Não aceitar HTML arbitrário do utilizador.
8. É necessário integrar e validar a imagem de lançamento como recurso público antes de utilizar a campanha.

## Estado
- Migração `newsletter_campaigns` aplicada ao Supabase; RLS confirmado nas duas tabelas.
- Campanha de lançamento criada como `draft`.
- A Vercel compilou a ramificação de pré-visualização.
- `RESEND_NEWSLETTER_SEGMENT_ID`, `RESEND_MARKETING_FROM_EMAIL` e `RESEND_WEBHOOK_SECRET` ainda não foram configuradas.
- A sincronização bidirecional de contactos e os testes reais continuam pendentes.
- Não fazer merge para a branch principal antes de aprovação das verificações e de uma campanha de teste.
