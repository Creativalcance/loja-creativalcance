# Faturação manual após expedição

## Percurso

A passagem de uma encomenda paga a expedida (ou entregue) coloca um alerta na fila de emails para `info@creativalcance.com`. Aplica-se à atualização do fornecedor e às alterações administrativas, incluindo os artigos manuais 360. O cron existente de emails, a cada cinco minutos, processa o alerta. A chave por encomenda impede novos alertas por repetição da sincronização ou do estado. Não se reenviam encomendas ao fornecedor.

O alerta conserva um retrato dos dados do cliente e de faturação/entrega, artigos, quantidades, preços e personalização, totais, IVA, portes, valor recebido e reembolsado e dados de expedição. O retrato é uma lista explícita de campos: não contém custos do fornecedor, margens, notas internas, chaves nem dados de cartão. Os testes são identificados no assunto e corpo. O alerta interno não aparece na cronologia do cliente.

No detalhe da encomenda no admin, em Faturação, o administrador indica o número e carrega o PDF (até 3 MB). Guardar associa o documento à encomenda e coloca o email ao cliente na fila, dentro da mesma transação. A ação tenta enviá-lo logo a seguir. O email, no idioma da encomenda, inclui o PDF em anexo e uma ligação à área de cliente. O estado é marcado como enviado após aceitação pelo serviço de email; isso não comprova entrega na caixa de entrada.

Em caso de falha, o PDF mantém-se e o cron volta a tentar, até cinco tentativas automáticas. O admin mostra o estado do envio. Voltar a guardar permite tentar novamente o mesmo email, mesmo depois de esgotar as tentativas automáticas. Um documento já enviado não volta a ser enviado ao guardar o mesmo número e PDF. Uma substituição cria uma versão imutável com outro identificador e outro email. Um envio pendente de uma versão substituída é cancelado.

## Acesso e consistência

- Bucket privado `order-invoices`, sem políticas de leitura/escrita direta para anon/authenticated. O servidor valida PDF, tamanho e associação à encomenda; só um administrador ativo pode carregar.
- Área de cliente, comercial e admin validam o acesso à encomenda antes de gerar uma ligação assinada por 60 segundos. As ligações antigas HTTPS continuam disponíveis.
- Uploads são imutáveis, sem sobrescrita. A atualização da encomenda usa a versão `updated_at` para rejeitar alterações concorrentes. A gravação da fatura e a colocação do email na fila são atómicas.
- Os envios usam a chave de idempotência já existente. Não se envia um email sem anexo se a leitura do PDF falhar. Alertas de faturação que já deixaram de ser necessários são cancelados antes do envio.

## Publicação

1. Aplicar `manual_order_invoices` (colunas, bucket, tipos de email e função privada).
2. Publicar a aplicação com os novos formatos de email e confirmar o deployment READY.
3. Aplicar `enable_manual_invoice_notifications` para ativar o trigger. Esta separação impede que a aplicação anterior processe os novos tipos de email.

A publicação não altera as credenciais Stripe nem `STRICKER_ORDER_TEST_MODE`. Antes de receber encomendas reais, configurar em Production a chave Stripe LIVE, o segredo do webhook LIVE de `/api/stripe/webhook` e o modo real do fornecedor em conjunto, seguido de redeploy e compra controlada.

## Verificação

254 testes automáticos aprovados, incluindo 18 novos testes de anexos nos seis idiomas, recuperação, deduplicação, PDFs inválidos, tamanho, acesso por encomenda, autorização administrativa e conflito de gravação. TypeScript, ESLint e build webpack aprovados. Testes de envio usam um serviço simulado; não foi enviado um PDF fictício a um cliente real.
