import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";
import { signOut } from "../contexts/AuthContext";
import { AuthTokenErrors } from "./errors/AuthTokenErrors";

interface FailedRequestQueue {
  onSuccess: (token: string) => void;
  onFailure: (error: AxiosError) => void;
}

let failedRequestQueue = <FailedRequestQueue[]>[];
let isRefreshing = false;

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: "http://localhost:3333",
  });
  
  api.defaults.headers.common[
    "Authorization"
  ] = `Bearer ${cookies["nextauth:token"]}`;

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        if (error.response?.data?.code === "token.expired") {
          cookies = parseCookies(ctx);

          const { "nextauth:refreshToken": refreshToken } = cookies;

          const originalConfig = error.config;

          if (!isRefreshing) {
            isRefreshing = true;

            api
              .post("/refresh", { refreshToken })
              .then((response) => {
                const { token } = response?.data;

                setCookie(ctx, "nextauth:token", token, {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  path: "/",
                });
                setCookie(
                  ctx,
                  "nextauth:refreshToken",
                  response.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30, // 30 days
                    path: "/",
                  }
                );

                api.defaults.headers.common[
                  "Authorization"
                ] = `Bearer ${token}`;

                failedRequestQueue.forEach((request) =>
                  request.onSuccess(token)
                );
                failedRequestQueue = [];
              })
              .catch((error) => {
                failedRequestQueue.forEach((request) =>
                  request.onFailure(error)
                );
                failedRequestQueue = [];

                if (process.browser) {
                  signOut();
                }
              })
              .finally(() => (isRefreshing = false));
          }

          return new Promise((resolve, reject) => {
            failedRequestQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers!["Authorization"] = `Bearer ${token}`;

                resolve(api(originalConfig));
              },
              onFailure: (err: AxiosError) => {
                reject(err);
              },
            });
          });
        } else {
          if (process.browser) {
            signOut();
          } else {
            return Promise.reject(new AuthTokenErrors());
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return api;
}
