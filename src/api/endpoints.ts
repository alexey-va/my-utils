/**
 * Backend route paths (relative to `VITE_API_BASE_URL` or same-origin `/api` via Vite proxy).
 */
export const apiEndpoints = {
  health: "/api/health",
  healthSteps: "/api/health/steps",
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
  },
  admin: {
    settings: "/api/admin/settings",
    setting: (key: string) => `/api/admin/settings/${encodeURIComponent(key)}`,
  },
  workouts: {
    exercises: "/api/workouts/exercises",
    exerciseProgress: (id: string) => `/api/workouts/exercises/${id}/progress`,
    exercise: (id: string) => `/api/workouts/exercises/${id}`,
    entry: (exerciseId: string, performedOn: string) =>
      `/api/workouts/exercises/${exerciseId}/entries/${performedOn}`,
    grid: "/api/workouts/grid",
    entries: "/api/workouts/entries",
  },
} as const;
