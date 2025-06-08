/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import cryptoService from './src/services/crypto';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        // Prova a caricare la chiave di crittografia
        await cryptoService.loadKey();
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Errore nel controllo autenticazione:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['authToken', 'username', 'encryptionKey']);
    await cryptoService.clear();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return null; // Potresti mostrare uno splash screen qui
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <AppNavigator
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
    </>
  );
}
