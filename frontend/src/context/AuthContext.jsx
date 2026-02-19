import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState('light');

    // Theme Logic
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            setTheme(storedTheme);
        } else {
            localStorage.setItem('theme', 'light');
            setTheme('light');
        }
    }, []);

    useEffect(() => {
        const html = document.documentElement;
        if (theme === 'dark') {
            html.classList.add('dark');
            html.classList.remove('light');
        } else {
            html.classList.add('light');
            html.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // Auth Logic
    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    const checkUserLoggedIn = async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (role, email, password) => { // Role argument kept for compatibility
        try {
            const { data } = await api.post('/auth/login', { email, password });
            setUser(data);
            return true;
        } catch (error) {
            console.error("Login failed:", error.response?.data?.message || error.message);
            return false;
        }
    };

    const signup = async (userData) => {
        try {
            const { data } = await api.post('/auth/register', { ...userData, role: 'student' });
            setUser(data);
            return true;
        } catch (error) {
            console.error("Signup failed:", error.response?.data?.message || error.message);
            return false;
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
            setUser(null);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading, theme, toggleTheme }}>
            {children}
        </AuthContext.Provider>
    );
};
