import type { DataProvider } from "@refinedev/core";

/**
 * Stub Refine data provider — no backend yet.
 * When APIs are ready, implement CRUD here using `apiClient` from `src/api`
 * or swap in `@refinedev/simple-rest` pointed at `VITE_API_BASE_URL`.
 */
export const dataProvider = {
  getList: async () => ({ data: [], total: 0 }),
  getOne: async () => ({ data: {} }),
  create: async () => ({ data: {} }),
  update: async () => ({ data: {} }),
  deleteOne: async () => ({ data: {} }),
} as unknown as DataProvider;
