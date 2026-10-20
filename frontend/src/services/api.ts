const API_BASE = `http://${window.location.hostname}:5000/api`;

// Helper to get auth headers
function getHeaders(): any {
  const token = localStorage.getItem('hlms_token');
  const headers: any = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Global fetch wrapper
async function request(path: any, options: any = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

export const apiService = {
  // Authentication
  async login(identifier, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    localStorage.setItem('hlms_token', data.token);
    localStorage.setItem('hlms_user', JSON.stringify(data.user));
    return data.user;
  },

  logout() {
    localStorage.removeItem('hlms_token');
    localStorage.removeItem('hlms_user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('hlms_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async getProfile() {
    return request('/auth/profile');
  },

  async updateProfile(name, phone) {
    return request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, phone })
    });
  },

  async changePassword(currentPassword, newPassword) {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // Leaves
  async applyLeave(formData) {
    return request('/leaves/apply', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
  },

  async applyExtension(newEndDate: string, newExpectedReturnTime: string, extensionReason: string) {
    return request('/leaves/extend', {
      method: 'POST',
      body: JSON.stringify({ newEndDate, newExpectedReturnTime, extensionReason })
    });
  },

  async getPendingExtensions() {
    return request('/leaves/extensions');
  },

  async reviewExtension(extensionId: number, action: string, remarks: string) {
    return request('/leaves/extensions/review', {
      method: 'POST',
      body: JSON.stringify({ extensionId, action, remarks })
    });
  },

  async getStudentLeaves() {
    return request('/leaves/student');
  },

  async getFacultyLeaves() {
    return request('/leaves/faculty');
  },

  async reviewLeave(leaveId, action, remarks) {
    return request('/leaves/review', {
      method: 'POST',
      body: JSON.stringify({ leaveId, action, remarks })
    });
  },

  async respondToClarification(leaveId, studentMessage) {
    return request('/leaves/clarify', {
      method: 'POST',
      body: JSON.stringify({ leaveId, studentMessage })
    });
  },

  // QR Passes & Guard Entry/Exit Logging
  async getActivePass() {
    return request('/passes/active');
  },

  async scanQR(token, lateReason = '') {
    return request('/passes/scan', {
      method: 'POST',
      body: JSON.stringify({ token, lateReason })
    });
  },

  // Admin Features
  async getAnalytics() {
    return request('/admin/analytics');
  },

  async getUsers() {
    return request('/admin/users');
  },

  async getAuditLogs() {
    return request('/admin/logs');
  },

  async updateSettings(defaultLeaveLimit) {
    return request('/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ defaultLeaveLimit })
    });
  },

  // Notifications
  async getNotifications() {
    return request('/notifications');
  },

  async markNotificationsRead() {
    return request('/notifications/read', {
      method: 'POST'
    });
  },

  async sendPassToGuard(passId: string) {
    return request('/passes/send-to-guard', {
      method: 'POST',
      body: JSON.stringify({ passId })
    });
  },

  async getPendingPasses() {
    return request('/passes/pending');
  },

  async processPass(passId: string, action: string, lateReason: string = '') {
    return request('/passes/process', {
      method: 'POST',
      body: JSON.stringify({ passId, action, lateReason })
    });
  },

  async getAttendance() {
    return request('/attendance');
  },

  async predictAttendance(startDate: string, goingTime: string, endDate: string, expectedReturnTime: string) {
    return request('/leaves/predict', {
      method: 'POST',
      body: JSON.stringify({ startDate, goingTime, endDate, expectedReturnTime })
    });
  },

  async resetStudentDemoData(studentId: number) {
    return request('/admin/reset-student', {
      method: 'POST',
      body: JSON.stringify({ studentId })
    });
  },

  async resetAllDemoData() {
    return request('/admin/reset-all-demo', {
      method: 'POST'
    });
  },

  async resetSemester() {
    return request('/admin/reset-semester', {
      method: 'POST'
    });
  }
};
