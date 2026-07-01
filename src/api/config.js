export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function add503Interceptor(axiosInstance) {
  axiosInstance.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error.response?.status === 503) {
        window.history.pushState({}, "", "/error/500");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
      return Promise.reject(error);
    }
  );
  return axiosInstance;
}
