const CLOCKFY_BASE_URL = 'https://api.clockify.me/api/v1';

export interface ClockfyCredentials {
  apiKey: string;
  workspaceId: string;
}

interface ClockfyRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  credentials?: Partial<ClockfyCredentials>;
  query?: Record<string, string | undefined>;
}

interface ClockfyEntityResponse {
  id: string;
  name?: string;
}

export interface ClockfyProjectSyncResult {
  clientId?: string;
  projectId?: string;
}

export interface ClockfyProjectInput {
  projectName: string;
  clientName?: string | null;
  credentials?: Partial<ClockfyCredentials>;
}

export interface ClockfyTimeEntryInput {
  projectId: string;
  start: Date;
  end?: Date | null;
  description?: string;
  billable?: boolean;
  credentials?: Partial<ClockfyCredentials>;
}

function buildQuery(query?: Record<string, string | undefined>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  }
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export function resolveClockfyCredentials(
  credentials?: Partial<ClockfyCredentials>
): ClockfyCredentials | null {
  const apiKey = credentials?.apiKey ?? process.env.CLOCKFY_API_KEY;
  const workspaceId = credentials?.workspaceId ?? process.env.CLOCKFY_WORKSPACE_ID;

  if (!apiKey || !workspaceId) {
    return null;
  }

  return { apiKey, workspaceId };
}

async function clockfyRequest<T>(
  path: string,
  options: ClockfyRequestOptions = {}
): Promise<T> {
  const resolved = resolveClockfyCredentials(options.credentials);
  if (!resolved) {
    throw new Error('Clockfy credentials are not configured.');
  }

  const { method = 'GET', body, query } = options;
  const url = `${CLOCKFY_BASE_URL}${path}${buildQuery(query)}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': resolved.apiKey,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clockfy request failed (${response.status} ${response.statusText}): ${errorText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function findEntityByName(
  type: 'clients' | 'projects',
  name: string,
  credentials?: Partial<ClockfyCredentials>
): Promise<ClockfyEntityResponse | null> {
  const resolved = resolveClockfyCredentials(credentials);
  if (!resolved) return null;

  const data = await clockfyRequest<ClockfyEntityResponse[]>(
    `/workspaces/${resolved.workspaceId}/${type}`,
    {
      credentials: resolved,
      query: { name },
    }
  );

  return data.find((entity) => entity.name?.toLowerCase() === name.toLowerCase()) ?? null;
}

export async function ensureClockfyClient(
  clientName: string,
  credentials?: Partial<ClockfyCredentials>
): Promise<string | null> {
  if (!clientName?.trim()) return null;

  try {
    const existing = await findEntityByName('clients', clientName, credentials);
    if (existing?.id) return existing.id;

    const resolved = resolveClockfyCredentials(credentials);
    if (!resolved) return null;

    const created = await clockfyRequest<ClockfyEntityResponse>(
      `/workspaces/${resolved.workspaceId}/clients`,
      {
        method: 'POST',
        credentials: resolved,
        body: { name: clientName },
      }
    );

    return created.id;
  } catch (error) {
    console.error('Clockfy client sync failed', error);
    return null;
  }
}

export async function ensureClockfyProject(
  input: ClockfyProjectInput
): Promise<ClockfyProjectSyncResult | null> {
  const { projectName, clientName, credentials } = input;
  if (!projectName?.trim()) return null;

  const resolved = resolveClockfyCredentials(credentials);
  if (!resolved) return null;

  try {
    const existing = await findEntityByName('projects', projectName, resolved);
    if (existing?.id) {
      return { projectId: existing.id };
    }

    let clientId: string | undefined;
    if (clientName?.trim()) {
      clientId = (await ensureClockfyClient(clientName, resolved)) ?? undefined;
    }

    const created = await clockfyRequest<ClockfyEntityResponse>(
      `/workspaces/${resolved.workspaceId}/projects`,
      {
        method: 'POST',
        credentials: resolved,
        body: {
          name: projectName,
          clientId,
          public: false,
        },
      }
    );

    return { projectId: created.id, clientId };
  } catch (error) {
    console.error('Clockfy project sync failed', error);
    return null;
  }
}

export async function ensureClockfySyncForProject(
  input: ClockfyProjectInput
): Promise<ClockfyProjectSyncResult | null> {
  return ensureClockfyProject(input);
}

export async function createClockfyTimeEntry(
  input: ClockfyTimeEntryInput
): Promise<string | null> {
  const resolved = resolveClockfyCredentials(input.credentials);
  if (!resolved) return null;
  if (!input.projectId || !input.end) return null;

  try {
    const entry = await clockfyRequest<{ id: string }>(
      `/workspaces/${resolved.workspaceId}/time-entries`,
      {
        method: 'POST',
        credentials: resolved,
        body: {
          start: input.start.toISOString(),
          end: input.end.toISOString(),
          description: input.description ?? 'Focus session',
          billable: input.billable ?? true,
          projectId: input.projectId,
        },
      }
    );

    return entry.id;
  } catch (error) {
    console.error('Clockfy time entry creation failed', error);
    return null;
  }
}
