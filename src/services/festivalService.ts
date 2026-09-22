import api from "./api";
import type { Festival } from "../types/brand.types";
import type { PaginatedResponse } from "../types/api.types";

export interface FestivalUpdate {
  id: string
  isEnabled: boolean
  preferredCategories?: string[]
}

export const festivalService = {
  getAll: async (params?: { page?: number; search?: string }) => {
    const response = await api.get<PaginatedResponse<Festival>>("/festivals", { params });
    return response.data;
  },

  getById: (id: string) => api.get<{ data: Festival }>(`/festivals/${id}`),

  toggle: (id: string, isEnabled: boolean) =>
    api.patch<{ festival: Festival }>(`/festivals/${id}`, { isEnabled }),

  updateCategories: (id: string, preferredCategories: string[]) =>
    api.patch<{ festival: Festival }>(`/festivals/${id}`, { preferredCategories }),

  bulkSave: (festivals: FestivalUpdate[]) =>
    api.post<{ message: string }>("/festivals/bulk", { festivals }),

  // Interceptor unwraps { success, data } → data, so response.data = { categories: string[] }
  getProductCategories: () =>
    api.get<{ categories: string[] }>("/products/categories"),
};
