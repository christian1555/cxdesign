// cloud.js
window.TrueTab = window.TrueTab || {};

function updateCloudSaveUI() {
    // Cloud save section is now in account section, so it's automatically shown/hidden with account
    const layoutNameInput = document.getElementById('layoutNameInput');
    if (layoutNameInput) {
        layoutNameInput.value = `Layout ${new Date().toLocaleDateString()}`;
    }
}

function refreshCloudLayoutsList() {
    window.TrueTab.loadAndDisplayLayouts();
}

function getCurrentLayoutData() {
    const widgetsArray = window.TrueTab.widgetsArray || [];

    return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        exportedDate: new Date().toLocaleDateString(),
        widgets: widgetsArray.map(w => ({
            id: w.id,
            type: w.type,
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
            settings: w.settings
        })),
        layoutMemory: window.TrueTab.layoutMemory || {},
        appearanceSettings: { ...window.TrueTab.appearanceSettings }
    };
}

function applyLayoutData(data) {
    try {
        // Validate layout data
        if (!data.widgets || !Array.isArray(data.widgets)) {
            throw new Error('Invalid layout data: missing widgets array');
        }

        // Update widgets array
        window.TrueTab.widgetsArray = data.widgets.map(w => ({
            id: w.id,
            type: w.type,
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
            settings: w.settings || window.TrueTab.utils.getDefaultSettings(w.type)
        }));

        // Update layout memory
        if (data.layoutMemory) {
            window.TrueTab.layoutMemory = data.layoutMemory;
            localStorage.setItem('truetab-layout-memory', JSON.stringify(data.layoutMemory));
        }

        // Update appearance settings (fully replace to ensure custom backgrounds and all settings are loaded)
        if (data.appearanceSettings) {
            // Save to localStorage first
            localStorage.setItem('truetab-appearance', JSON.stringify(data.appearanceSettings));
            // Reload appearance settings from localStorage to ensure internal state is updated
            window.TrueTab.loadAppearanceSettings();
        }

        // Save widgets to localStorage
        localStorage.setItem('truetab-widgets', JSON.stringify(window.TrueTab.widgetsArray));

        // Rebuild widget cache and render
        window.TrueTab.rebuildWidgetCache();
        window.TrueTab.renderWidgets();
        window.TrueTab.updateGridOutline();

        return true;
    } catch (error) {
        console.error('Error applying layout:', error);
        alert(`Failed to apply layout: ${error.message}`);
        return false;
    }
}

// Show/hide new layout form
const addNewLayoutBtn = document.getElementById('addNewLayoutBtn');
const newLayoutForm = document.getElementById('newLayoutForm');
const cancelNewLayoutBtn = document.getElementById('cancelNewLayoutBtn');

if (addNewLayoutBtn && newLayoutForm) {
    addNewLayoutBtn.addEventListener('click', () => {
        newLayoutForm.classList.remove('hidden');
        addNewLayoutBtn.style.display = 'none';
        const layoutNameInput = document.getElementById('layoutNameInput');
        if (layoutNameInput) {
            layoutNameInput.value = `Layout ${new Date().toLocaleDateString()}`;
            layoutNameInput.focus();
        }
    });
}

if (cancelNewLayoutBtn && newLayoutForm && addNewLayoutBtn) {
    cancelNewLayoutBtn.addEventListener('click', () => {
        newLayoutForm.classList.add('hidden');
        addNewLayoutBtn.style.display = 'block';
        const layoutNameInput = document.getElementById('layoutNameInput');
        if (layoutNameInput) {
            layoutNameInput.value = '';
        }
    });
}

// Save new layout
const saveToCloudBtn = document.getElementById('saveToCloudBtn');
if (saveToCloudBtn) {
    saveToCloudBtn.addEventListener('click', async () => {
        const layoutNameInput = document.getElementById('layoutNameInput');
        const cloudSaveMessage = document.getElementById('cloudSaveMessage');

        if (layoutNameInput) {
            const layoutData = getCurrentLayoutData();
            const result = await window.TrueTab.saveLayoutToDatabase(layoutNameInput.value, layoutData);

            if (cloudSaveMessage) {
                cloudSaveMessage.textContent = result.message || (result.success ? 'Layout saved!' : 'Failed to save layout');
                cloudSaveMessage.className = result.success ? 'message success' : 'message error';
                setTimeout(() => { cloudSaveMessage.textContent = ''; cloudSaveMessage.className = 'message'; }, 3000);
            }

            if (result.success) {
                // Hide form and show button
                if (newLayoutForm && addNewLayoutBtn) {
                    newLayoutForm.classList.add('hidden');
                    addNewLayoutBtn.style.display = 'block';
                }
                layoutNameInput.value = '';
                refreshCloudLayoutsList();
            }
        }
    });
}

// Handle Load, Overwrite, and Delete actions from layout list items
// These will be attached dynamically when layouts are rendered
window.TrueTab.handleLoadLayout = async function(layoutId) {
    const result = await window.TrueTab.loadLayoutFromDatabase(layoutId);
    const cloudSaveMessage = document.getElementById('cloudSaveMessage');

    if (result.success && result.layout) {
        applyLayoutData(result.layout.data);
        if (cloudSaveMessage) {
            cloudSaveMessage.textContent = 'Layout loaded successfully!';
            cloudSaveMessage.className = 'message success';
            setTimeout(() => { cloudSaveMessage.textContent = ''; cloudSaveMessage.className = 'message'; }, 3000);
        }
    } else {
        if (cloudSaveMessage) {
            cloudSaveMessage.textContent = result.message || 'Failed to load layout';
            cloudSaveMessage.className = 'message error';
            setTimeout(() => { cloudSaveMessage.textContent = ''; cloudSaveMessage.className = 'message'; }, 3000);
        }
    }
};

window.TrueTab.handleOverwriteLayout = async function(layoutId, layoutName) {
    if (!confirm(`Overwrite "${layoutName}" with current layout?`)) {
        return;
    }

    const layoutData = getCurrentLayoutData();
    const result = await window.TrueTab.updateLayoutInDatabase(layoutId, layoutName, layoutData);
    const cloudSaveMessage = document.getElementById('cloudSaveMessage');

    if (cloudSaveMessage) {
        cloudSaveMessage.textContent = result.message || (result.success ? 'Layout overwritten!' : 'Failed to overwrite layout');
        cloudSaveMessage.className = result.success ? 'message success' : 'message error';
        setTimeout(() => { cloudSaveMessage.textContent = ''; cloudSaveMessage.className = 'message'; }, 3000);
    }

    if (result.success) {
        refreshCloudLayoutsList();
    }
};

window.TrueTab.handleDeleteLayout = async function(layoutId, layoutName) {
    if (!confirm(`Delete "${layoutName}"? This cannot be undone.`)) {
        return;
    }

    const result = await window.TrueTab.deleteLayoutFromDatabase(layoutId);
    const cloudSaveMessage = document.getElementById('cloudSaveMessage');

    if (cloudSaveMessage) {
        cloudSaveMessage.textContent = result.message || (result.success ? 'Layout deleted!' : 'Failed to delete layout');
        cloudSaveMessage.className = result.success ? 'message success' : 'message error';
        setTimeout(() => { cloudSaveMessage.textContent = ''; cloudSaveMessage.className = 'message'; }, 3000);
    }

    if (result.success) {
        refreshCloudLayoutsList();
    }
};

window.TrueTab.updateCloudSaveUI = updateCloudSaveUI;
window.TrueTab.refreshCloudLayoutsList = refreshCloudLayoutsList;
window.TrueTab.getCurrentLayoutData = getCurrentLayoutData;
window.TrueTab.applyLayoutData = applyLayoutData;