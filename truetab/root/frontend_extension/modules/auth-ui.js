// auth-ui.js
window.TrueTab = window.TrueTab || {};

const countries = [
    { code: 'DK', name: 'Denmark' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' }
    // Add more as needed
];

function initializeAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const countrySelect = document.getElementById('countrySelect');

    // Populate country dropdown
    if (countrySelect) {
        countrySelect.innerHTML = '<option value="">Select your country (optional)</option>' +
            countries.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
    }

    // Show register form
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.remove('hidden');
        });
    }

    // Show login form
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            if (registerForm) registerForm.classList.add('hidden');
            if (loginForm) loginForm.classList.remove('hidden');
        });
    }

    // Handle login
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;
            const messageEl = document.getElementById('authMessage');

            if (!email || !password) {
                if (messageEl) {
                    messageEl.textContent = 'Please fill in all fields';
                    messageEl.className = 'message error';
                }
                return;
            }

            const result = await window.TrueTab.handleLogin(email, password);
            if (result.success) {
                if (messageEl) {
                    messageEl.textContent = 'Login successful!';
                    messageEl.className = 'message success';
                }
                updateProfileUI(result.user);
                populateAccountInfo(result.user);
            } else {
                if (messageEl) {
                    messageEl.textContent = result.message || 'Login failed';
                    messageEl.className = 'message error';
                }
            }
        });
    }

    // Handle register
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const email = document.getElementById('regEmail')?.value;
            const username = document.getElementById('regUsername')?.value;
            const password = document.getElementById('regPassword')?.value;
            const messageEl = document.getElementById('authMessage');

            if (!email || !username || !password) {
                if (messageEl) {
                    messageEl.textContent = 'Please fill in all fields';
                    messageEl.className = 'message error';
                }
                return;
            }

            const result = await window.TrueTab.handleRegister(email, username, password);
            if (result.success) {
                if (messageEl) {
                    messageEl.textContent = 'Registration successful!';
                    messageEl.className = 'message success';
                }
                updateProfileUI(result.user);
                populateAccountInfo(result.user);
            } else {
                if (messageEl) {
                    messageEl.textContent = result.message || 'Registration failed';
                    messageEl.className = 'message error';
                }
            }
        });
    }

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.TrueTab.handleLogout();
            updateProfileUI(null);
            const messageEl = document.getElementById('authMessage');
            if (messageEl) {
                messageEl.textContent = 'Logged out successfully';
                messageEl.className = 'message success';
                setTimeout(() => { messageEl.textContent = ''; }, 3000);
            }
        });
    }

    // Handle +Save New Layout button
    const addNewLayoutBtn = document.getElementById('addNewLayoutBtn');
    const newLayoutForm = document.getElementById('newLayoutForm');
    const cancelNewLayoutBtn = document.getElementById('cancelNewLayoutBtn');
    const saveToCloudBtn = document.getElementById('saveToCloudBtn');

    if (addNewLayoutBtn) {
        addNewLayoutBtn.addEventListener('click', () => {
            if (newLayoutForm) {
                newLayoutForm.classList.remove('hidden');
                newLayoutForm.style.display = 'block';
            }
        });
    }

    if (cancelNewLayoutBtn) {
        cancelNewLayoutBtn.addEventListener('click', () => {
            if (newLayoutForm) {
                newLayoutForm.classList.add('hidden');
                newLayoutForm.style.display = 'none';
                const layoutNameInput = document.getElementById('layoutNameInput');
                if (layoutNameInput) layoutNameInput.value = '';
            }
        });
    }

    if (saveToCloudBtn) {
        saveToCloudBtn.addEventListener('click', async () => {
            const layoutNameInput = document.getElementById('layoutNameInput');
            const cloudSaveMessage = document.getElementById('cloudSaveMessage');

            if (!layoutNameInput || !layoutNameInput.value.trim()) {
                if (cloudSaveMessage) {
                    cloudSaveMessage.textContent = 'Please enter a layout name';
                    cloudSaveMessage.className = 'message error';
                }
                return;
            }

            const layoutName = layoutNameInput.value.trim();
            const result = await window.TrueTab.saveCurrentLayoutToCloud(layoutName);

            if (cloudSaveMessage) {
                if (result.success) {
                    cloudSaveMessage.textContent = 'Layout saved successfully!';
                    cloudSaveMessage.className = 'message success';

                    // Hide the form and clear input
                    if (newLayoutForm) {
                        newLayoutForm.classList.add('hidden');
                        newLayoutForm.style.display = 'none';
                    }
                    layoutNameInput.value = '';

                    // Reload layouts list
                    loadAndDisplayLayouts();
                } else {
                    cloudSaveMessage.textContent = result.message || 'Failed to save layout';
                    cloudSaveMessage.className = 'message error';
                }

                setTimeout(() => { cloudSaveMessage.textContent = ''; }, 3000);
            }
        });
    }
}

function updateProfileUI(user) {
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const accountSection = document.getElementById('accountSection');
    const authSection = document.getElementById('authSection');

    if (user) {
        // Show account section, hide auth section
        if (accountSection) {
            accountSection.classList.remove('hidden');
            accountSection.style.display = 'block';
        }
        if (authSection) {
            authSection.style.display = 'none';
        }

        // Populate user info
        if (userName) userName.textContent = user.username || user.displayName || 'User';
        if (userEmail) userEmail.textContent = user.email || '';

        // Load user's saved layouts
        window.TrueTab.loadAndDisplayLayouts();
    } else {
        // Show auth section, hide account section
        if (accountSection) {
            accountSection.classList.add('hidden');
            accountSection.style.display = 'none';
        }
        if (authSection) {
            authSection.style.display = 'block';
        }
    }
}

function populateAccountInfo(user) {
    if (!user) return;
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const countrySelect = document.getElementById('countrySelect');

    if (userName) userName.textContent = user.username || user.displayName || '';
    if (userEmail) userEmail.textContent = user.email || '';
    if (countrySelect) countrySelect.value = user.country || '';
}

function loadAndDisplayLayouts() {
    window.TrueTab.loadUserLayouts().then(result => {
        const cloudLayoutsList = document.getElementById('cloudLayoutsList');

        if (!cloudLayoutsList) return;

        if (result.success && result.layouts && result.layouts.length > 0) {
            cloudLayoutsList.innerHTML = result.layouts.map(layout => {
                const date = new Date(layout.created_at || layout.updated_at);
                const formattedDate = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });

                return `
                    <div class="settings-list-item" data-layout-id="${layout.id}" data-layout-name="${layout.name.replace(/"/g, '&quot;')}">
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                            <span class="settings-list-item-name">${layout.name}</span>
                            <span style="font-size: 11px; color: var(--settings-text-color); opacity: 0.5;">${formattedDate}</span>
                        </div>
                        <button type="button" class="settings-list-item-btn layout-load-btn" data-action="load" title="Load">
                            Load
                        </button>
                        <button type="button" class="settings-list-item-btn layout-overwrite-btn" data-action="overwrite" title="Overwrite">
                            Overwrite
                        </button>
                        <button type="button" class="settings-list-item-btn layout-delete-btn" data-action="delete" title="Delete">
                            X
                        </button>
                    </div>
                `;
            }).join('');

            // Add event delegation for layout action buttons
            setupLayoutEventListeners();
        } else {
            cloudLayoutsList.innerHTML = '<div class="cloud-layouts-empty">No saved layouts yet. Click "+ Save New Layout" to get started.</div>';
        }
    });
}

function setupLayoutEventListeners() {
    const cloudLayoutsList = document.getElementById('cloudLayoutsList');
    if (!cloudLayoutsList) return;

    // Remove old listener if exists
    cloudLayoutsList.removeEventListener('click', handleLayoutAction);

    // Add event delegation listener
    cloudLayoutsList.addEventListener('click', handleLayoutAction);
}

function handleLayoutAction(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const layoutItem = button.closest('.settings-list-item');
    if (!layoutItem) return;

    const layoutId = parseInt(layoutItem.dataset.layoutId);
    const layoutName = layoutItem.dataset.layoutName;
    const action = button.dataset.action;

    if (action === 'load') {
        window.TrueTab.handleLoadLayout(layoutId);
    } else if (action === 'overwrite') {
        window.TrueTab.handleOverwriteLayout(layoutId, layoutName);
    } else if (action === 'delete') {
        window.TrueTab.handleDeleteLayout(layoutId, layoutName);
    }
}

function updateUserProfileUI() {
    const accountName = document.getElementById('accountName');
    const accountCountry = document.getElementById('accountCountry');
    if (accountName && accountCountry) {
        window.TrueTab.updateUserProfile(accountCountry.value).then(result => {
            if (result.success) {
                updateProfileUI({ ...window.TrueTab.getCurrentUser(), country: accountCountry.value });
            } else {
                console.error('Profile update failed:', result.message);
            }
        });
    }
}

/**
 * Initialize auth UI in a specific container element
 * Generates all HTML and attaches event listeners
 * @param {HTMLElement} containerElement - The element to inject auth UI into
 */
function initAuthUI(containerElement) {
    if (!containerElement) {
        console.error('initAuthUI: Container element is required');
        return;
    }

    // Generate the complete auth UI HTML
    const authHTML = `
        <!-- Auth Section (Login/Register Forms) - Shown when logged out -->
        <div id="authSection" class="auth-section">
            <!-- Login Form -->
            <div id="loginForm" class="auth-form">
                <div class="settings-menu-item">
                    <label for="loginEmail">Email or Username</label>
                    <input type="text" id="loginEmail" class="settings-input" placeholder="Email or Username" autocomplete="username">
                </div>
                <div class="settings-menu-item">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" class="settings-input" placeholder="Password" autocomplete="current-password">
                </div>
                <div class="settings-menu-item" style="flex-direction: column; align-items: stretch; gap: 8px; margin-top: 16px;">
                    <div id="loginBtn" class="popup-tab popup-tab-save">Login</div>
                </div>
                <p class="form-switch" style="text-align: center; margin-top: 12px; color: var(--settings-text-color); opacity: 0.8;">
                    Don't have an account? <a href="#" id="showRegister" style="color: var(--settings-accent-color); text-decoration: none;">Register</a>
                </p>
            </div>

            <!-- Register Form -->
            <div id="registerForm" class="auth-form hidden">
                <div class="settings-menu-item">
                    <label for="regEmail">Email</label>
                    <input type="email" id="regEmail" class="settings-input" placeholder="Email" autocomplete="email">
                </div>
                <div class="settings-menu-item">
                    <label for="regUsername">Username</label>
                    <input type="text" id="regUsername" class="settings-input" placeholder="Username" autocomplete="username">
                </div>
                <div class="settings-menu-item">
                    <label for="regPassword">Password</label>
                    <input type="password" id="regPassword" class="settings-input" placeholder="Password (min 6 characters)" autocomplete="new-password">
                </div>
                <div class="settings-menu-item" style="flex-direction: column; align-items: stretch; gap: 8px; margin-top: 16px;">
                    <div id="registerBtn" class="popup-tab popup-tab-save">Register</div>
                </div>
                <p class="form-switch" style="text-align: center; margin-top: 12px; color: var(--settings-text-color); opacity: 0.8;">
                    Already have an account? <a href="#" id="showLogin" style="color: var(--settings-accent-color); text-decoration: none;">Login</a>
                </p>
            </div>

            <p id="authMessage" class="message" style="margin-top: 16px;"></p>
        </div>

        <!-- Account Section (Logged In State) - Hidden by default -->
        <div id="accountSection" class="account-section hidden" style="display: none;">
            <div class="settings-divider" style="margin: 16px 0;"></div>
            <div class="settings-section-title">Account Information</div>

            <div class="settings-menu-item">
                <label>Username</label>
                <span id="userName" style="flex: 1; text-align: right; color: var(--settings-text-color); opacity: 0.8;"></span>
            </div>

            <div class="settings-menu-item">
                <label>Email</label>
                <span id="userEmail" style="flex: 1; text-align: right; color: var(--settings-text-color); opacity: 0.8;"></span>
            </div>

            <div class="settings-menu-item">
                <label for="countrySelect">Country</label>
                <select id="countrySelect" class="settings-select">
                    <option value="">Select your country (optional)</option>
                </select>
            </div>

            <div class="settings-menu-item" style="flex-direction: column; align-items: stretch; gap: 8px; margin-top: 16px;">
                <div id="logoutBtn" class="popup-tab popup-tab-cancel">Logout</div>
            </div>

            <div class="settings-divider" style="margin: 16px 0;"></div>
            <div class="settings-section-title">Cloud Layouts</div>

            <!-- Cloud Layouts List -->
            <div id="cloudLayoutsList" class="cloud-layouts-list">
                <!-- Layouts will be dynamically inserted here -->
            </div>

            <!-- Save New Layout Button -->
            <div id="addNewLayoutBtn" class="settings-button" style="width: 100%; margin-top: 12px;">
                <span class="iconify" data-icon="material-symbols:add" data-width="16" data-height="16"></span>
                Save New Layout
            </div>

            <!-- New Layout Form (Hidden by default) -->
            <div id="newLayoutForm" class="new-layout-form hidden" style="display: none; margin-top: 12px;">
                <div class="settings-menu-item">
                    <label for="layoutNameInput">Layout Name</label>
                    <input type="text" id="layoutNameInput" class="settings-input" placeholder="e.g., Work Setup">
                </div>
                <div class="settings-menu-item" style="gap: 8px; padding: 6px; margin-top: 8px;">
                    <div id="saveToCloudBtn" class="popup-tab popup-tab-save">Save</div>
                    <div id="cancelNewLayoutBtn" class="popup-tab popup-tab-cancel">Cancel</div>
                </div>
            </div>

            <p id="cloudSaveMessage" class="message" style="margin-top: 16px;"></p>
            <p id="accountMessage" class="message"></p>
        </div>
    `;

    // Inject HTML into container
    containerElement.innerHTML = authHTML;

    // Initialize all event listeners using the existing function
    initializeAuthUI();

    // Check if user is already logged in and update UI accordingly
    const currentUser = window.TrueTab.getCurrentUser ? window.TrueTab.getCurrentUser() : null;
    if (currentUser) {
        updateProfileUI(currentUser);
        populateAccountInfo(currentUser);
    }
}

window.TrueTab.countries = countries;
window.TrueTab.initializeAuthUI = initializeAuthUI;
window.TrueTab.initAuthUI = initAuthUI;  // NEW: Export the container-based init function
window.TrueTab.updateProfileUI = updateProfileUI;
window.TrueTab.populateAccountInfo = populateAccountInfo;
window.TrueTab.loadAndDisplayLayouts = loadAndDisplayLayouts;
window.TrueTab.updateUserProfileUI = updateUserProfileUI;