import axios from "axios";

// Same URL your app already talks to for /collections, /query, etc.
const API_BASE = "https://story-bible-manager.onrender.com";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sbm_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes("/auth/login") ||
                            error.config?.url?.includes("/auth/signup");

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("sbm_token");
      localStorage.removeItem("sbm_email");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };