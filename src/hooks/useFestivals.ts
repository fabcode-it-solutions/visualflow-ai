import { useQuery } from "@tanstack/react-query";
import { festivalService } from "../services/festivalService";
import type { Festival } from "../types/brand.types";

export function useFestivals() {
  return useQuery<Festival[], Error>({
    queryKey: ["festivals"],
    queryFn: async () => {
      const response = await festivalService.getAll();
      return response.data;
    },
  });
}

export function useFestival(id: string) {
  return useQuery<Festival, Error>({
    queryKey: ["festival", id],
    queryFn: async () => {
      const response = await festivalService.getById(id);
      return response.data.data;
    },
    enabled: !!id,
  });
}
