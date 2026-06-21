// auth.js - Authentication and Session Manager
import { DB } from './db.js';

const SESSION_KEY = 'portal_session';

export class Auth {
  static login(email, password) {
    const users = DB.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password.');
    }
    if (user.status !== 'active') {
      throw new Error('This account has been deactivated.');
    }

    const session = {
      userId: user.id,
      role: user.role,
      name: user.name,
      gender: user.gender
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  static register({ name, email, password, gender, role }) {
    const users = DB.getUsers();
    const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      throw new Error('An account with this email already exists.');
    }

    const id = (role === 'supplier' ? 'sup_' : 'usr_') + Math.random().toString(36).substr(2, 9);
    const newUser = {
      id,
      email,
      password,
      role,
      name,
      gender,
      address: '',
      mobile: '',
      status: 'active'
    };

    DB.saveUser(newUser);
    return newUser;
  }

  static logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  static getSession() {
    const sess = sessionStorage.getItem(SESSION_KEY);
    return sess ? JSON.parse(sess) : null;
  }

  static getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;
    return DB.getUsers().find(u => u.id === session.userId) || null;
  }

  static isAuthenticated() {
    return this.getSession() !== null;
  }
}
