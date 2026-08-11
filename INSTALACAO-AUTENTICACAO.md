# Instalação da correção de autenticação

## 1. Código

Substituir o projeto pela versão deste pacote, preservando apenas o ficheiro `.env.local` do ambiente.

```cmd
rmdir /s /q node_modules
rmdir /s /q .next
npm install
```

No `.env.local`, confirmar que existe a URL pública canónica, sem barra final:

```env
NEXT_PUBLIC_SITE_URL=https://loja.creativalcance.com
```

Usar o domínio real atualmente configurado no Supabase/Vercel caso seja diferente.

## 2. Base de dados

No Supabase SQL Editor, executar integralmente:

```text
supabase/migrations/20260811_auth_customer_admin.sql
```

A migração converte os perfis existentes, corrige as funções, restringe o campo `role` e atualiza as políticas legadas. É transacional: se ocorrer um erro, as alterações são revertidas.

## 3. Supabase Auth

Em Authentication → URL Configuration:

- Site URL: o mesmo valor de `NEXT_PUBLIC_SITE_URL`.
- Redirect URLs: adicionar `https://DOMINIO/auth/callback` e `https://DOMINIO/**`.
- Em desenvolvimento, adicionar `http://localhost:3000/auth/callback` e `http://localhost:3000/**`.

Em Authentication → Sign In / Providers → Email:

- manter o fornecedor Email ativo;
- ativar confirmação de e-mail;
- definir mínimo de 8 caracteres;
- ativar proteção contra palavras-passe comprometidas;
- ativar proteção segura na alteração da palavra-passe.

## 4. Validação

```cmd
npm run build
npm run dev
```

Testar:

1. registo de novo Cliente e confirmação por e-mail;
2. login de Cliente → `/area-cliente`;
3. Cliente bloqueado ao abrir `/admin` ou `/api/admin/...`;
4. login de Admin → `/admin`;
5. Admin abre todos os cards existentes sem novo pedido de login;
6. recuperação e redefinição de palavra-passe;
7. Admin cria outro Admin em `/admin/utilizadores`;
8. Cliente atualiza nome/telefone sem poder alterar `role` ou `is_active`.
