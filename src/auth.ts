import * as core from "@actions/core";

export interface Credentials {
  apiKey: string;
}

export interface AuthInputs {
  apiKey: string;
  oauthClientId: string;
  oauthSecret: string;
  audience: string;
  apiServer: string;
}

export async function getCredentials(inputs: AuthInputs): Promise<Credentials> {
  const { apiKey, oauthClientId, oauthSecret, audience, apiServer } = inputs;

  if (!apiKey && (!oauthClientId || (!oauthSecret && !audience))) {
    throw new Error(
      "set api-key to your Tailscale API key, oauth-client-id and oauth-secret to a Tailscale OAuth ID and Secret, or oauth-client-id and audience to a Tailscale federated identity Client ID and OIDC audience",
    );
  }
  if (apiKey && (oauthClientId || oauthSecret || audience)) {
    throw new Error("set either api-key, oauth-client-id and oauth-secret, or oauth-client-id and audience");
  }
  if (oauthSecret && audience) {
    throw new Error("set either oauth-client-id and oauth-secret, or oauth-client-id and audience");
  }

  if (apiKey) {
    core.setSecret(apiKey);
    return { apiKey };
  }

  if (oauthSecret || (oauthClientId && !audience)) {
    const token = await exchangeOAuthSecret(apiServer, oauthClientId, oauthSecret);
    core.setSecret(token);
    return { apiKey: token };
  }

  const idToken = await core.getIDToken(audience);
  core.setSecret(idToken);
  const token = await exchangeIdentityToken(apiServer, oauthClientId, idToken);
  core.setSecret(token);
  return { apiKey: token };
}

async function exchangeOAuthSecret(apiServer: string, clientId: string, clientSecret: string): Promise<string> {
  core.setSecret(clientSecret);
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const resp = await fetch(`https://${apiServer}/api/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return readTokenResponse(resp, "OAuth token exchange");
}

async function exchangeIdentityToken(apiServer: string, clientId: string, idToken: string): Promise<string> {
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", "");
  body.set("client_id", clientId);
  body.set("jwt", idToken);
  const resp = await fetch(`https://${apiServer}/api/v2/oauth/token-exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return readTokenResponse(resp, "token exchange");
}

async function readTokenResponse(resp: Response, description: string): Promise<string> {
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`${description} failed with status ${resp.status}: ${text}`);
  }
  const payload = JSON.parse(text) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error(`${description} response did not include access_token`);
  }
  return payload.access_token;
}
