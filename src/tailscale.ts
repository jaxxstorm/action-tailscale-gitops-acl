import { ACLGitopsTestError, ACLGitopsTestErrorBody } from "./errors.js";

export interface ACLRead {
  readonly etag: string;
  readonly policy: string;
}

export class TailscaleClient {
  private readonly baseURL: string;
  private readonly authHeader: string;

  constructor(
    private readonly apiServer: string,
    private readonly tailnet: string,
    apiKey: string,
  ) {
    this.baseURL = `https://${apiServer}/api/v2/tailnet/${encodeURIComponent(tailnet)}`;
    this.authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
  }

  async getACL(): Promise<ACLRead> {
    const resp = await fetch(`${this.baseURL}/acl`, {
      method: "GET",
      headers: {
        Accept: "application/hujson",
        Authorization: this.authHeader,
      },
    });
    if (resp.status !== 200) {
      const errorDetails = await resp.text();
      throw new Error(`wanted HTTP status code 200 but got ${resp.status}: ${JSON.stringify(errorDetails)}`);
    }
    return {
      etag: shuck(resp.headers.get("etag") ?? ""),
      policy: await resp.text(),
    };
  }

  async getACLETag(): Promise<string> {
    const resp = await fetch(`${this.baseURL}/acl`, {
      method: "GET",
      headers: {
        Accept: "application/hujson",
        Authorization: this.authHeader,
      },
    });
    if (resp.status !== 200) {
      const errorDetails = await resp.text();
      throw new Error(`wanted HTTP status code 200 but got ${resp.status}: ${JSON.stringify(errorDetails)}`);
    }
    await resp.body?.cancel();
    return shuck(resp.headers.get("etag") ?? "");
  }

  async applyACL(policyFile: string, policy: string, oldEtag: string): Promise<void> {
    const resp = await fetch(`${this.baseURL}/acl`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/hujson",
        "If-Match": `"${oldEtag}"`,
      },
      body: policy,
    });
    if (resp.status !== 200) {
      throw new ACLGitopsTestError(await readJSONError(resp), policyFile);
    }
  }

  async testACL(policyFile: string, standardizedPolicy: string): Promise<void> {
    const resp = await fetch(`${this.baseURL}/acl/validate`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/hujson",
      },
      body: standardizedPolicy,
    });
    const body = await readJSONError(resp);
    if ((body.Message && body.Message.length > 0) || (body.Data && body.Data.length > 0)) {
      throw new ACLGitopsTestError(body, policyFile);
    }
    if (resp.status !== 200) {
      throw new Error(`wanted HTTP status code 200 but got ${resp.status}`);
    }
  }
}

function shuck(s: string): string {
  return s.length >= 2 ? s.slice(1, -1) : s;
}

async function readJSONError(resp: Response): Promise<ACLGitopsTestErrorBody> {
  const text = await resp.text();
  if (!text) {
    return {};
  }
  return JSON.parse(text) as ACLGitopsTestErrorBody;
}
