
export interface User {
  id: string;
  username: string;
  password: string; // In a real app, this would be hashed!
  role: string;
  clearanceLevel: number;
}

const DB_KEY = 'intelboard_users_db';

// Initial JSON Data (The "Seed" Database)
const INITIAL_DB: User[] = [
  { 
    id: 'u_001', 
    username: 'admin', 
    password: 'password', 
    role: 'Commander', 
    clearanceLevel: 5 
  },
  { 
    id: 'u_002', 
    username: 'agent', 
    password: 'access', 
    role: 'Field Operative', 
    clearanceLevel: 3 
  }
];

export const authService = {
  // Initialize the JSON DB in LocalStorage if it doesn't exist
  init: () => {
    const existing = localStorage.getItem(DB_KEY);
    if (!existing) {
      localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_DB));
    }
  },

  // Read: Verify credentials against the JSON data
  login: (username: string, password: string): { success: boolean; user?: User; message?: string } => {
    const dbStr = localStorage.getItem(DB_KEY);
    if (!dbStr) return { success: false, message: 'Database Error' };

    const users: User[] = JSON.parse(dbStr);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      return { success: false, message: 'User identity not found in registry.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Invalid security key.' };
    }

    return { success: true, user };
  },

  // Write: Add a new user to the JSON data
  register: (username: string, password: string): { success: boolean; message?: string } => {
    const dbStr = localStorage.getItem(DB_KEY);
    const users: User[] = dbStr ? JSON.parse(dbStr) : [];

    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Agent ID already registered.' };
    }

    const newUser: User = {
      id: `u_${Date.now()}`,
      username,
      password,
      role: 'Analyst',
      clearanceLevel: 1
    };

    users.push(newUser);
    localStorage.setItem(DB_KEY, JSON.stringify(users));
    
    return { success: true };
  }
};
