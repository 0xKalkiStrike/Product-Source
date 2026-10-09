import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, ensureArray } from '../services/api';
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
  createProject: (name: string, description?: string) => Promise<Project>;
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
      let items: Project[] = ensureArray<Project>(res.data);
      
      if (items.length === 0) {
        try {
          const createRes = await api.post('/projects', {
            name: 'Default Market Scope',
            description: 'Default workspace project for product verification & market intelligence'
          });
          items = [createRes.data];
        } catch (createErr) {
          console.error('Failed to auto-create default project:', createErr);
        }
      }
      
      setProjects(items);
      if (items.length > 0) {
        setActiveProject((prev) => {
          if (!prev || !items.find(p => p.id === prev.id)) {
            return items[0];
          }
          return prev;
        });
      } else {
        setActiveProject(null);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (name: string, description?: string): Promise<Project> => {
    const res = await api.post('/projects', { name, description });
    const newProj: Project = res.data;
    setProjects(prev => [...prev, newProj]);
    setActiveProject(newProj);
    return newProj;
  };

  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProject, fetchProjects, createProject, loading }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
};
