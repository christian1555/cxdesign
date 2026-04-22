// auth.js - Authentication module for TrueTab Extension
// Handles login, register, logout, and token verification with backend_db

const AUTH_API_URL = "http://localhost:8000";

// Current authenticated user state
let currentUser = null;

/**
 * Verify existing token and load user data
 * @param {string} token - JWT token from localStorage
 * @returns {Promise<object|null>} User object if valid, null otherwise
 */
async function verifyAndLoadUser(token) {
  try {
    const res = await fetch(`${AUTH_API_URL}/auth.php?action=verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.valid && data.user) {
      currentUser = {
        id: data.user.sub,
        email: data.user.email,
        username: data.user.username
      };
      return currentUser;
    } else {
      localStorage.removeItem('token');
      currentUser = null;
      return null;
    }
  } catch (err) {
    console.error('Token verification failed:', err);
    localStorage.removeItem('token');
    currentUser = null;
    return null;
  }
}

/**
 * Handle user login
 * @param {string} email - Email or username
 * @param {string} password - Password
 * @returns {Promise<{success: boolean, message: string, user?: object}>}
 */
async function handleLogin(email, password) {
  // Validation
  if (!email || !password) {
    return { success: false, message: 'Please fill in all fields' };
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/auth.php?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem('token', data.token);
      currentUser = data.user;
      return {
        success: true,
        message: 'Login successful!',
        user: data.user
      };
    } else {
      return {
        success: false,
        message: data.error || 'Login failed'
      };
    }
  } catch (err) {
    console.error('Login error:', err);
    return {
      success: false,
      message: 'Network error. Please try again.'
    };
  }
}

/**
 * Handle user registration
 * @param {string} email - Email address
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<{success: boolean, message: string, user?: object}>}
 */
async function handleRegister(email, username, password) {
  // Validation
  if (!email || !username || !password) {
    return { success: false, message: 'Please fill in all fields' };
  }

  if (password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters' };
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/auth.php?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password })
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem('token', data.token);
      currentUser = data.user;
      return {
        success: true,
        message: 'Registration successful!',
        user: data.user
      };
    } else {
      return {
        success: false,
        message: data.error || 'Registration failed'
      };
    }
  } catch (err) {
    console.error('Registration error:', err);
    return {
      success: false,
      message: 'Network error. Please try again.'
    };
  }
}

/**
 * Handle user logout
 */
function handleLogout() {
  localStorage.removeItem('token');
  currentUser = null;
}

/**
 * Check if user is currently authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
  return currentUser !== null;
}

/**
 * Get current user data
 * @returns {object|null}
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * Update user profile (country)
 * @param {string} country - Country name
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function updateUserProfile(country) {
  const token = localStorage.getItem('token');

  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/user/update_profile.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ country })
    });

    const data = await res.json();

    if (data.success) {
      if (currentUser) {
        currentUser.country = country;
      }
      return { success: true, message: 'Country updated successfully!' };
    } else {
      return { success: false, message: data.error || 'Update failed' };
    }
  } catch (err) {
    console.error('Update error:', err);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

/**
 * Load user's saved layouts
 * @returns {Promise<{success: boolean, layouts?: array, message?: string}>}
 */
async function loadUserLayouts() {
  const token = localStorage.getItem('token');

  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/user/list_layouts.php`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (data.layouts) {
      return { success: true, layouts: data.layouts };
    } else {
      return { success: false, message: data.error || 'Failed to load layouts' };
    }
  } catch (err) {
    console.error('Failed to load layouts:', err);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

/**
 * Save current layout to database
 * @param {string} name - Layout name
 * @param {object} layoutData - Layout data object
 * @returns {Promise<{success: boolean, layout_id?: number, message?: string}>}
 */
async function saveLayoutToDatabase(name, layoutData) {
  const token = localStorage.getItem('token');

  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  if (!name || !name.trim()) {
    return { success: false, message: 'Layout name is required' };
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/user/save_layout.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: name.trim(),
        data: JSON.stringify(layoutData)
      })
    });

    const data = await res.json();

    if (data.success) {
      return { success: true, layout_id: data.layout_id, message: 'Layout saved successfully!' };
    } else {
      return { success: false, message: data.error || 'Failed to save layout' };
    }
  } catch (err) {
    console.error('Save layout error:', err);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

/**
 * Update existing layout in database
 * @param {number} layoutId - Layout ID
 * @param {string} name - Layout name
 * @param {object} layoutData - Layout data object
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function updateLayoutInDatabase(layoutId, name, layoutData) {
  const token = localStorage.getItem('token');

  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  if (!layoutId) {
    return { success: false, message: 'Layout ID is required' };
  }

  if (!name || !name.trim()) {
    return { success: false, message: 'Layout name is required' };
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/user/update_layout.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: layoutId,
        name: name.trim(),
        data: JSON.stringify(layoutData)
      })
    });

    const data = await res.json();

    if (data.success) {
      return { success: true, message: 'Layout updated successfully!' };
    } else {
      return { success: false, message: data.error || 'Failed to update layout' };
    }
  } catch (err) {
    console.error('Update layout error:', err);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

/**
 * Load layout from database
 * @param {number} layoutId - Layout ID
 * @returns {Promise<{success: boolean, layout?: object, message?: string}>}
 */
async function loadLayoutFromDatabase(layoutId) {
  const token = localStorage.getItem('token');

  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  if (!layoutId) {
    return { success: false, message: 'Layout ID is required' };
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/user/get_layout.php?id=${layoutId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (data.layout) {
      // Parse the content from the wrapper
      const layoutContent = data.layout.data?.content || data.layout.data;
      const parsedLayout = typeof layoutContent === 'string' ? JSON.parse(layoutContent) : layoutContent;

      return {
        success: true,
        layout: {
          id: data.layout.id,
          name: data.layout.name,
          data: parsedLayout,
          created_at: data.layout.created_at,
          updated_at: data.layout.updated_at
        }
      };
    } else {
      return { success: false, message: data.error || 'Failed to load layout' };
    }
  } catch (err) {
    console.error('Load layout error:', err);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

/**
 * Delete layout from database
 * @param {number} layoutId - Layout ID to delete
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function deleteLayoutFromDatabase(layoutId) {
  const token = localStorage.getItem('token');

  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  if (!layoutId) {
    return { success: false, message: 'Layout ID is required' };
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/user/delete_layout.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id: layoutId })
    });

    const data = await res.json();

    if (data.success) {
      return { success: true, message: 'Layout deleted successfully!' };
    } else {
      return { success: false, message: data.error || 'Failed to delete layout' };
    }
  } catch (err) {
    console.error('Delete layout error:', err);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

/**
 * Initialize authentication on page load
 * @returns {Promise<boolean>} True if user is authenticated
 */
async function initAuth() {
  const token = localStorage.getItem('token');

  if (token) {
    const user = await verifyAndLoadUser(token);
    return user !== null;
  }

  return false;
}

// Export all auth functions to window.TrueTab
window.TrueTab = window.TrueTab || {};
window.TrueTab.verifyAndLoadUser = verifyAndLoadUser;
window.TrueTab.handleLogin = handleLogin;
window.TrueTab.handleRegister = handleRegister;
window.TrueTab.handleLogout = handleLogout;
window.TrueTab.isAuthenticated = isAuthenticated;
window.TrueTab.getCurrentUser = getCurrentUser;
window.TrueTab.updateUserProfile = updateUserProfile;
window.TrueTab.loadUserLayouts = loadUserLayouts;
window.TrueTab.saveLayoutToDatabase = saveLayoutToDatabase;
window.TrueTab.deleteLayoutFromDatabase = deleteLayoutFromDatabase;
window.TrueTab.updateLayoutInDatabase = updateLayoutInDatabase;
window.TrueTab.loadLayoutFromDatabase = loadLayoutFromDatabase;
window.TrueTab.initAuth = initAuth;
