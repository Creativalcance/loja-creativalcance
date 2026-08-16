# SEO Foundation 1.0 — 360 Merchandising

## Objetivo

Adicionar a primeira camada técnica de SEO/GEO sem alterar a lógica comercial, sincronizações ou integrações existentes da loja.

## Implementado

- `robots.txt` dinâmico via `src/app/robots.ts`.
- `sitemap.xml` dinâmico com páginas públicas, categorias e produtos ativos.
- Configuração central de domínio/entidade em `src/lib/seo/site.ts`.
- Helpers de metadata em `src/lib/seo/metadata.ts`.
- JSON-LD de produto com `Product`, `Offer` e `BreadcrumbList`.
- Metadata individual por produto: title, description, canonical, Open Graph e Twitter.
- Canonical próprio na homepage e remoção do canonical global `/` do layout raiz.
- URLs absolutas no JSON-LD global de `Organization` e `WebSite`.
- `noindex` nas áreas privadas/transacionais e no personalizador de produto.
- Correção da referência pública residual "Loja Creativ" para "360 Merchandising" na homepage.

## Deliberadamente não alterado

- `src/lib/stricker/**`
- `src/lib/pricing/**`
- `src/lib/checkout/**`
- `src/app/api/**`
- `supabase/migrations/**`
- `src/components/product/**`
- Stripe e webhooks
- sincronizações Stricker
- cálculo de preços e margens
- carrinho e checkout (lógica existente)
- submissão e acompanhamento de encomendas
- esquema da base de dados
- URLs atuais de categorias e produtos

## Validação realizada

- Comparação integral com o ZIP original para confirmar os ficheiros alterados.
- Verificação de sintaxe TypeScript/TSX em todos os ficheiros `src` (195 ficheiros) através do compilador TypeScript.
- Não foi possível executar `npm run build` neste ambiente porque o ZIP não inclui `node_modules` e a instalação offline das dependências não ficou disponível. Antes de produção, deve ser executado o build normal do projeto no ambiente com dependências instaladas.

## Variável de ambiente

A infraestrutura usa `NEXT_PUBLIC_SITE_URL` como domínio canónico. Se a variável não existir, o fallback é:

`https://360-merchandising.com`

Em produção, confirmar que `NEXT_PUBLIC_SITE_URL` contém exatamente o domínio canónico pretendido (com ou sem `www`, conforme a configuração real da loja).
