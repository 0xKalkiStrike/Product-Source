import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (proj: Project | null) => void;
  fetchProjects: () => Promise<void>;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchProjects = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.get('/projects');
      const items: Project[] = res.data.items || [];
      setProjects(items);
      if (items.length > 0 && !activeProject) {
        setActiveProject(items[0]);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProject, fetchProjects, loading }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
};
