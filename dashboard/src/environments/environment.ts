export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  appName: 'TurboVets Secure Task Management',
  version: '1.0.0',
  features: {
    auditLogs: true,
    userManagement: true,
    taskManagement: true,
    realTimeUpdates: false
  },
  auth: {
    tokenKey: 'auth_token',
    userKey: 'auth_user',
    tokenExpirationWarning: 5 // minutes
  },
  ui: {
    theme: 'light',
    itemsPerPage: 10,
    maxItemsPerPage: 100
  }
};
