import axios, { type AxiosRequestConfig } from "axios";
import { getSession } from "../auth";

type ApiRequestConfig = AxiosRequestConfig & { body?: string };

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
});

export async function apiRequest<T>(
  path: string,
  init?: ApiRequestConfig,
  organizationId?: string
): Promise<T> {
  const session = await getSession().catch(() => null);
  const headers = { ...init?.headers } as Record<string, string | undefined>;
  if (session?.access_token)
    headers.Authorization = `Bearer ${session.access_token}`;
  if (organizationId) headers["X-Organization-Id"] = organizationId;
  const { body, ...config } = init ?? {};
  // Let the browser set the multipart boundary instead of the instance default JSON header.
  if (config.data instanceof FormData) headers["Content-Type"] = undefined;
  const { data } = await client.request<T>({
    ...config,
    url: path,
    headers,
    ...(body === undefined ? {} : { data: body }),
  });
  return data;
}
