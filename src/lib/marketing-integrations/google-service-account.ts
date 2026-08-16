import { createSign } from "node:crypto";
import {
  GCP_PROJECT_NUMBER,
  GCP_WORKLOAD_IDENTITY_POOL_ID,
  GCP_WORKLOAD_IDENTITY_PROVIDER_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
} from "@/lib/marketing-integrations/config";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_STS_URL = "https://sts.googleapis.com/v1/token";
const GOOGLE_CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const TOKEN_SAFETY_WINDOW_MS = 60_000;

type CachedToken = {
  token: string;
  expiresAt: number;
};

type AccessTokenOptions = {
  vercelOidcToken?: string | null;
};

const tokenCache = new Map<string, CachedToken>();

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n").trim();
}

function workloadIdentityProviderAudience(): string {
  if (!GCP_PROJECT_NUMBER) {
    throw new Error("GCP_PROJECT_NUMBER não está configurado.");
  }

  if (!GCP_WORKLOAD_IDENTITY_POOL_ID) {
    throw new Error("GCP_WORKLOAD_IDENTITY_POOL_ID não está configurado.");
  }

  if (!GCP_WORKLOAD_IDENTITY_PROVIDER_ID) {
    throw new Error("GCP_WORKLOAD_IDENTITY_PROVIDER_ID não está configurado.");
  }

  return `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_PROVIDER_ID}`;
}

function serviceAccountEmail(): string {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL não está configurado.");
  }

  return GOOGLE_SERVICE_ACCOUNT_EMAIL;
}

function hasLegacyServiceAccountKey(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  );
}

function isVercelProduction(): boolean {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}

function hasWorkloadIdentityConfig(): boolean {
  return Boolean(
    GCP_PROJECT_NUMBER &&
      GCP_WORKLOAD_IDENTITY_POOL_ID &&
      GCP_WORKLOAD_IDENTITY_PROVIDER_ID &&
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
  );
}

function getGoogleServiceAccountCredentials(): {
  clientEmail: string;
  privateKey: string;
} {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL não está configurado.");
  }

  if (!privateKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY não está configurado.");
  }

  return {
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}

function buildSignedJwt(scopes: string[]): string {
  const { clientEmail, privateKey } = getGoogleServiceAccountCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claims = {
    iss: clientEmail,
    scope: [...new Set(scopes)].sort().join(" "),
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedClaims = base64Url(JSON.stringify(claims));
  const unsigned = `${encodedHeader}.${encodedClaims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey);

  return `${unsigned}.${base64Url(signature)}`;
}

async function getLegacyKeyAccessToken(scopes: string[]): Promise<CachedToken> {
  const assertion = buildSignedJwt(scopes);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        access_token?: unknown;
        expires_in?: unknown;
        error?: unknown;
        error_description?: unknown;
      }
    | null;

  if (!response.ok || typeof payload?.access_token !== "string") {
    const details =
      typeof payload?.error_description === "string"
        ? payload.error_description
        : typeof payload?.error === "string"
          ? payload.error
          : `HTTP ${response.status}`;
    throw new Error(`Falha na autenticação Google por chave de serviço: ${details}`);
  }

  const expiresIn = Number(payload.expires_in);

  return {
    token: payload.access_token,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
  };
}

async function exchangeVercelOidcForFederatedToken(
  vercelOidcToken: string,
): Promise<CachedToken> {
  const response = await fetch(GOOGLE_STS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      audience: workloadIdentityProviderAudience(),
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      scope: GOOGLE_CLOUD_PLATFORM_SCOPE,
      subject_token: vercelOidcToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        access_token?: unknown;
        expires_in?: unknown;
        error?: unknown;
        error_description?: unknown;
      }
    | null;

  if (!response.ok || typeof payload?.access_token !== "string") {
    const details =
      typeof payload?.error_description === "string"
        ? payload.error_description
        : typeof payload?.error === "string"
          ? payload.error
          : `HTTP ${response.status}`;
    throw new Error(`Falha ao trocar o OIDC da Vercel no Google STS: ${details}`);
  }

  const expiresIn = Number(payload.expires_in);

  return {
    token: payload.access_token,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
  };
}

async function impersonateServiceAccount(params: {
  federatedToken: string;
  scopes: string[];
}): Promise<CachedToken> {
  const email = serviceAccountEmail();
  const response = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(email)}:generateAccessToken`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${params.federatedToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        scope: params.scopes,
        lifetime: "3600s",
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        accessToken?: unknown;
        expireTime?: unknown;
        error?: { message?: unknown };
      }
    | null;

  if (!response.ok || typeof payload?.accessToken !== "string") {
    const details =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : `HTTP ${response.status}`;
    throw new Error(`Falha ao representar a conta de serviço Google: ${details}`);
  }

  const expireTime =
    typeof payload.expireTime === "string" ? Date.parse(payload.expireTime) : Number.NaN;

  return {
    token: payload.accessToken,
    expiresAt: Number.isFinite(expireTime) ? expireTime : Date.now() + 3600 * 1000,
  };
}

async function getWorkloadIdentityAccessToken(params: {
  scopes: string[];
  vercelOidcToken?: string | null;
}): Promise<CachedToken> {
  const oidcToken =
    params.vercelOidcToken?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();

  if (!oidcToken) {
    throw new Error(
      "Token OIDC da Vercel indisponível. A sincronização automática Google deve correr num deployment Vercel Production.",
    );
  }

  const federated = await exchangeVercelOidcForFederatedToken(oidcToken);

  return impersonateServiceAccount({
    federatedToken: federated.token,
    scopes: params.scopes,
  });
}

export function isGoogleServiceAccountConfigured(): boolean {
  if (hasLegacyServiceAccountKey()) {
    return true;
  }

  return isVercelProduction() && hasWorkloadIdentityConfig();
}

export async function getGoogleAccessToken(
  scopes: string[],
  options?: AccessTokenOptions,
): Promise<string> {
  const normalizedScopes = [...new Set(scopes)].sort();
  const authMode = hasLegacyServiceAccountKey() ? "legacy-key" : "vercel-oidc";
  const cacheKey = `${authMode}:${normalizedScopes.join(" ")}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt - TOKEN_SAFETY_WINDOW_MS > Date.now()) {
    return cached.token;
  }

  const credentials = hasLegacyServiceAccountKey()
    ? await getLegacyKeyAccessToken(normalizedScopes)
    : await getWorkloadIdentityAccessToken({
        scopes: normalizedScopes,
        vercelOidcToken: options?.vercelOidcToken,
      });

  tokenCache.set(cacheKey, credentials);

  return credentials.token;
}
