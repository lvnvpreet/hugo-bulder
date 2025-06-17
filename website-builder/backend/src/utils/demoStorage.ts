// Simple in-memory storage for demo purposes
interface DemoUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  projectsLimit: number;
  projectsUsed: number;
  createdAt: string;
}

interface DemoProject {
  id: string;
  userId: string;
  name: string;
  description: string;
  wizardData: any;
  type: string;
  createdAt: string;
}

class DemoStorage {
  private users: Map<string, DemoUser> = new Map();
  private projects: Map<string, DemoProject> = new Map();
  private nextUserId = 1;
  private nextProjectId = 1;

  createUser(userData: Partial<DemoUser>): DemoUser {
    const id = `demo_user_${this.nextUserId++}`;
    const user: DemoUser = {
      id,
      email: userData.email || `demo_${id}@temp.demo`,
      name: userData.name || `Demo User ${id}`,
      plan: 'free',
      projectsLimit: 5,
      projectsUsed: 0,
      createdAt: new Date().toISOString(),
    };
    
    this.users.set(id, user);
    return user;
  }

  getUser(id: string): DemoUser | null {
    return this.users.get(id) || null;
  }
  createProject(userId: string, projectData: any): DemoProject {
    const id = `demo_project_${this.nextProjectId++}`;
    const project: DemoProject = {
      id,
      userId,
      name: projectData.name || 'Untitled Project',
      description: projectData.description || '',
      wizardData: projectData.wizardData || {},
      type: projectData.websiteType || projectData.type || 'website',
      createdAt: new Date().toISOString(),
    };
    
    this.projects.set(id, project);
    
    // Update user's project count
    const user = this.users.get(userId);
    if (user) {
      user.projectsUsed += 1;
      this.users.set(userId, user);
    }
    
    return project;
  }

  getUserProjects(userId: string): DemoProject[] {
    return Array.from(this.projects.values()).filter(p => p.userId === userId);
  }

  getProject(id: string): DemoProject | null {
    return this.projects.get(id) || null;
  }
}

export const demoStorage = new DemoStorage();
