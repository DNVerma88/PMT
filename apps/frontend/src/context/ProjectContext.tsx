import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { projectsService, type Project } from '../services/projects.service';
import { useAuth } from '../features/auth/useAuth';

interface ProjectContextValue {
  /** All projects the user has access to */
  projects: Project[];
  /** Currently selected project; null = "All projects" (admin only) */
  activeProject: Project | null;
  setActiveProject: (p: Project | null) => void;
  /** Patch the in-memory active project (and the projects list) without a round-trip */
  updateActiveProject: (patch: Partial<Project>) => void;
  isLoading: boolean;
  /** Refresh projects list (e.g. after create/delete) */
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = 'pmt_active_project_id';

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, hasRole } = useAuth();
  const isAdmin = hasRole(['SUPER_ADMIN', 'ADMIN']);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    setIsLoading(true);
    try {
      // Admins see all projects; regular users see only their projects
      const list = isAdmin
        ? await projectsService.getAll()
        : await projectsService.getMy();
      setProjects(list);

      // Restore persisted selection
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const found = list.find((p) => p.id === savedId) ?? null;
        setActiveProjectState(found);
      } else if (list.length === 1) {
        // Auto-select when only one project
        setActiveProjectState(list[0]);
      } else {
        setActiveProjectState(null);
      }
    } catch {
      setProjects([]);
      setActiveProjectState(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, isAdmin]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const setActiveProject = useCallback((p: Project | null) => {
    setActiveProjectState(p);
    if (p) {
      localStorage.setItem(STORAGE_KEY, p.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  /** Patch the in-memory active project and the matching entry in the projects list */
  const updateActiveProjectFn = useCallback((patch: Partial<Project>) => {
    setActiveProjectState((prev) => (prev ? { ...prev, ...patch } : prev));
    setProjects((prev) =>
      prev.map((p) =>
        p.id === (patch.id ?? p.id) ? { ...p, ...patch } : p,
      ),
    );
  }, []);

  const refreshProjects = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProject, updateActiveProject: updateActiveProjectFn, isLoading, refreshProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside <ProjectProvider>');
  return ctx;
}
