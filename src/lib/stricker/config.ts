export type StrickerConfig = {
  apiBaseUrl: string;
  username: string;
  password: string;
  apiKey: string;
  productsEndpoint: string;
};

export function getStrickerConfig(): StrickerConfig {
  const apiBaseUrl = process.env.STRICKER_API_BASE_URL;
  const username = process.env.STRICKER_API_USERNAME;
  const password = process.env.STRICKER_API_PASSWORD;
  const apiKey = process.env.STRICKER_API_KEY;
  const productsEndpoint = process.env.STRICKER_PRODUCTS_ENDPOINT;

  if (!apiBaseUrl) {
    throw new Error("STRICKER_API_BASE_URL não está configurado.");
  }

  if (!username) {
    throw new Error("STRICKER_API_USERNAME não está configurado.");
  }

  if (!password) {
    throw new Error("STRICKER_API_PASSWORD não está configurado.");
  }

  if (!apiKey) {
    throw new Error("STRICKER_API_KEY não está configurado.");
  }

  if (!productsEndpoint) {
    throw new Error("STRICKER_PRODUCTS_ENDPOINT não está configurado.");
  }

  return {
    apiBaseUrl,
    username,
    password,
    apiKey,
    productsEndpoint,
  };
}