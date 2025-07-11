import React, { createContext, useState, useContext } from 'react';
import { StyleSheet } from 'react-native';

// 1. Create the Theme Context
const ThemeContext = createContext({
  theme: 'light', // Default theme
  colors: {
    background: '#ffffff', // Default light mode colors
    text: '#000000',
    primary: '#007bff',
    secondary: '#6c757d',
    // ... more colors as needed
  },
  toggleTheme: () => {}, // Dummy function, will be overridden
});

// 2. Create Theme Provider Component
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  const colors = {
    light: {
      background: '#ffffff',
      text: '#000000',
      primary: '#007bff',
      secondary: '#6c757d',
    },
    dark: {
      background: '#121212',
      text: '#ffffff',
      primary: '#00a8ff',
      secondary: '#99a2aa',
    },
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const value = { theme, colors: colors[theme], toggleTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// 3. Create a custom hook to easily access the theme context
const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// 4. Optional: Stylesheet with theme-aware styles
const themeStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
});

export { ThemeProvider, useTheme, themeStyles };