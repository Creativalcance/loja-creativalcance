# Estado de lançamento das newsletters (13/10/2026)

- O código está na ramificação feature/newsletter-campaigns-20261013; não há envio público.
- O segmento de lançamento em português só pode receber inscrições PT com consentimento activo.
- A API Resend está configurada; o remetente previsto e o endereço de teste interno estão configurados apenas no ambiente Preview da Vercel.
- É necessário confirmar no painel Resend que o domínio do remetente está verificado antes de testar entregas.
- Continuam por obter os valores RESEND_NEWSLETTER_SEGMENT_ID e RESEND_WEBHOOK_SECRET.
- A lista comercial deve ser reconciliada com cancelamentos e supressões do Resend antes de qualquer envio.
- Os envios de teste requerem clique e confirmação de um administrador, são limitados a endereços internos autorizados.
- O modelo de email ainda precisa do banner gráfico final do lançamento.
- Verificar visualmente o email e os links, e testar cancelamento e webhook com eventos reais antes do merge.
