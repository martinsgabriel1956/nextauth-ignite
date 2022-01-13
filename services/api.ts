import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from 'nookies';

let cookies = parseCookies();

export const api = axios.create({
  baseURL: 'http://localhost:3333',
  headers: {
    'Authorization': `Bearer ${cookies['nextauth.token']}`
  }
});

api.interceptors.response.use(response => {
  return response;
}, (error: AxiosError) => {
  if(error.response?.status === 401) {
    if(error.response?.data?.message === 'Token.expired') {
      cookies = parseCookies();

      const { 'nextauth.refreshToekn': refreshToken } = cookies;

      api.post('/refresh', { refreshToken }).then(response => {
        const { token } = response.data.token;

        setCookie(undefined, "nextauth.token", token, {
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: "/",
        });
        setCookie(undefined, "nextauth.refreshToken", response.data.refreshToken);
  
        api.defaults.headers.common['Authorization'] = token;
      })
    } else {

    }
  }
});