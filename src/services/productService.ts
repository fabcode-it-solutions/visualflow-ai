import api from './api';
import { Product } from '../types/product.types';
import { PaginatedResponse } from '../types/api.types';

export const productService = {
  getAll: (filters?: { search?: string; page?: number; limit?: number; category?: string }) =>
    api.get<PaginatedResponse<Product>>('/products', { params: filters }),

  getById: (id: string) =>
    api.get<Product>(`/products/${id}`),

  sync: () =>
    api.post<{ synced: number; total: number }>('/products/sync'),
};
