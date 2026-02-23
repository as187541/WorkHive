// src/services/api.js

import axios from 'axios';

// Create an instance of axios with a base URL.
// This means you don't have to type 'http://localhost:5000/api/v1' for every call.
const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
});

// This is an "interceptor". It's a function that runs BEFORE each request is sent.
// Its job is to check for a token in localStorage and attach it to the request header.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // If the token exists, add the 'Authorization: Bearer <token>' header
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// This is the crucial line the error is about.
// It exports the configured axios instance as the default export.
export default api;