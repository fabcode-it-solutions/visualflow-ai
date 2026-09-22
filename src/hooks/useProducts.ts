import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import type { Product } from '../types/product.types';

export function useProducts() {
  return useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productService.getAll();
      return response.data.data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery<Product, Error>({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await productService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}
