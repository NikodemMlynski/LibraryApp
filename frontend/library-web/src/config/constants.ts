// src/constants.ts

// 1. Główne adresy ze zmiennych środowiskowych
export const API_URL = import.meta.env.VITE_API_URL;
export const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL;
export const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// 2. Gotowe, zbudowane endpointy dla Twoich mikroserwisów
// Dzięki temu w kodzie nie musisz za każdym razem pisać `${API_URL}/payments`
export const ENDPOINTS = {
  PAYMENTS: `${API_URL}/payments`,
  CATALOG: `${API_URL}/catalog/books`,
  LENDING: `${API_URL}/lending`,
  NOTIFY: `${API_URL}/notify`,
  ANALYTICS: `${API_URL}/analytics`,
} as const; 