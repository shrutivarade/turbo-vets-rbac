export const environment = {
  production: true,
  apiUrl: 'https://api.turbovets.com/api',
  appName: 'TurboVets Task Management',
  version: '1.0.0',
  features: {
    auditLogs: true,
    userManagement: true,
    taskManagement: true,
    realTimeUpdates: true
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
