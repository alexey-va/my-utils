/**
 * Backend route paths (relative to `VITE_API_BASE_URL` or same-origin `/api` via Vite proxy).
 */
export const apiEndpoints = {
  health: "/api/health",
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
  },
  workouts: {
    exercises: "/api/workouts/exercises",
    exerciseProgress: (id: string) => `/api/workouts/exercises/${id}/progress`,
    exercise: (id: string) => `/api/workouts/exercises/${id}`,
    grid: "/api/workouts/grid",
    entries: "/api/workouts/entries",
  },
} as const;
