// appearance.js
window.TrueTab = window.TrueTab || {};

let appearanceSettings = {
    cornerStyle: 'rounded',
    background: 'default',
    customBackground: null,
    stretchBackground: false,
    overlay: 0,
    blur: 0,
    settingsStyle: 'light',
    widgetCustomColor: '#000000',
    widgetCustomIconColor: '#ffffff',
    widgetCustomTextColor: '#ffffff',
    widgetOpacity: 15,
    widgetBlur: 10,
    widgetScrollbarMode: 'light',  // Hidden setting: 'light' or 'dark' based on widget background
    font: 'default',
    customFont: null,
    customFontName: null,
    hideBottomMenuWhenNotHovered: false,
    enableRubberBandScrolling: false,
    hideAppTitles: true,  // Inverted: true = show titles (default), false = hide titles
    hideAllGlassBG: false,  // Global setting to hide all glass backgrounds
    accentColor: '#81C3D7'  // Centralized accent color for UI elements
};

// Temporary settings cache for save/cancel functionality
let tempAppearanceSettings = null;
let isModalActive = false;

const fontOptions = {
    'default': { name: 'Default (System)', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', url: null },
    'inter': { name: 'Inter', family: '"Inter", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap' },
    'roboto': { name: 'Roboto', family: '"Roboto", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap' },
    'open-sans': { name: 'Open Sans', family: '"Open Sans", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap' },
    'lato': { name: 'Lato', family: '"Lato", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap' },
    'montserrat': { name: 'Montserrat', family: '"Montserrat", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap' },
    'playfair': { name: 'Playfair Display', family: '"Playfair Display", serif', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap' },
    'merriweather': { name: 'Merriweather', family: '"Merriweather", serif', url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap' },
    'courier': { name: 'Courier New', family: '"Courier New", Courier, monospace', url: null },
    'georgia': { name: 'Georgia', family: 'Georgia, serif', url: null }
};

function loadAppearanceSettings() {
    const saved = localStorage.getItem('truetab-appearance');
    if (saved) {
        try {
            const loadedSettings = JSON.parse(saved);
            // Merge loaded settings into the existing object to maintain reference
            Object.assign(appearanceSettings, loadedSettings);
        } catch (e) {
            console.error('Failed to load appearance settings:', e);
        }
    }
    // Ensure global reference is updated
    window.TrueTab.appearanceSettings = appearanceSettings;
    applyAppearanceSettings();
}

function saveAppearanceSettings() {
    // When modal is active, changes are applied live but not saved to localStorage
    // Only actually save when user clicks "Save" button
    if (!isModalActive) {
        localStorage.setItem('truetab-appearance', JSON.stringify(appearanceSettings));
    }
}

function applyAppearanceSettings() {
    const cornerRadius = appearanceSettings.cornerStyle === 'square' ? '0px' : '16px';
    document.documentElement.style.setProperty('--icon-radius', cornerRadius);

    const bgSize = appearanceSettings.stretchBackground ? 'cover' : 'contain';
    document.documentElement.style.setProperty('--bg-size', bgSize);

    if (appearanceSettings.customBackground) {
        document.body.style.backgroundImage = `url(${appearanceSettings.customBackground})`;
        // Ensure background size is applied directly to body element
        document.body.style.backgroundSize = bgSize;
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
    } else {
        applyTheme(appearanceSettings.background);
    }

    document.documentElement.style.setProperty('--bg-overlay', appearanceSettings.overlay / 100);
    document.documentElement.style.setProperty('--bg-blur', `${appearanceSettings.blur}px`);
    applyFont();
    applyWidgetStyle();
    applySettingsStyle();
    // Apply hide app titles class to body (inverted: hideAppTitles true = show, false = hide)
    if (!appearanceSettings.hideAppTitles) {
        document.body.classList.add('hide-app-titles');
    } else {
        document.body.classList.remove('hide-app-titles');
    }

    const bottomBar = document.querySelector('.bottom-bar');
    if (bottomBar) {
        if (appearanceSettings.hideBottomMenuWhenNotHovered) {
            bottomBar.classList.add('hide-when-not-hovered');
        } else {
            bottomBar.classList.remove('hide-when-not-hovered');
        }
    }
    updateAppearanceControls();
}

function applyFont() {
    const existingLink = document.querySelector('link[data-font-link]');
    if (existingLink) {
        existingLink.remove();
    }
    const existingStyle = document.querySelector('style[data-custom-font]');
    if (existingStyle) {
        existingStyle.remove();
    }
    const existingOverrides = document.querySelector('style[data-font-overrides]');
    if (existingOverrides) {
        existingOverrides.remove();
    }
    if (appearanceSettings.font === 'custom' && appearanceSettings.customFont) {
        const style = document.createElement('style');
        style.setAttribute('data-custom-font', 'true');
        const fontName = appearanceSettings.customFontName || 'CustomFont';
        style.textContent = `
            @font-face {
                font-family: "${fontName}";
                src: url(${appearanceSettings.customFont});
            }
        `;
        document.head.appendChild(style);
        const fontStack = `"${fontName}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        document.body.style.fontFamily = fontStack;
        const styleOverrides = document.createElement('style');
        styleOverrides.setAttribute('data-font-overrides', 'true');
        styleOverrides.textContent = `
            .search-input,
            .search-input::placeholder,
            .modal-footer button,
            .input-group input,
            .input-group select,
            #clearLayoutMemoryBtn {
                font-family: ${fontStack} !important;
            }
        `;
        document.head.appendChild(styleOverrides);
    } else if (appearanceSettings.font && fontOptions[appearanceSettings.font]) {
        const fontOption = fontOptions[appearanceSettings.font];
        if (fontOption.url) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = fontOption.url;
            link.setAttribute('data-font-link', 'true');
            document.head.appendChild(link);
        }
        document.body.style.fontFamily = fontOption.family;
        const styleOverrides = document.createElement('style');
        styleOverrides.setAttribute('data-font-overrides', 'true');
        styleOverrides.textContent = `
            .search-input,
            .search-input::placeholder,
            .modal-footer button,
            .input-group input,
            .input-group select,
            #clearLayoutMemoryBtn {
                font-family: ${fontOption.family} !important;
            }
        `;
        document.head.appendChild(styleOverrides);
    }

    // Apply font normalization after font is set
    // Use setTimeout to ensure DOM has updated with new font
    if (window.TrueTab.applyGlobalFontNormalization) {
        setTimeout(() => {
            window.TrueTab.applyGlobalFontNormalization().catch(err => {
                console.error('Font normalization failed:', err);
            });
        }, 100);
    }
}

function applyWidgetStyle() {
    const opacity = appearanceSettings.widgetOpacity / 100;
    const blur = appearanceSettings.widgetBlur;
    const bgHex = appearanceSettings.widgetCustomColor;
    const bgRgb = window.TrueTab.utils.hexToRgb(bgHex);
    const bgColor = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${opacity})`;
    const iconColor = appearanceSettings.widgetCustomIconColor;
    const textColor = appearanceSettings.widgetCustomTextColor;

    // Apply scrollbar colors based on saved mode (no calculation here for performance)
    applyScrollbarMode();

    document.documentElement.style.setProperty('--widget-bg-color', bgColor);
    document.documentElement.style.setProperty('--widget-bg-opacity', opacity);
    document.documentElement.style.setProperty('--widget-bg-blur', `${blur}px`);
    document.documentElement.style.setProperty('--widget-icon-color', iconColor);
    document.documentElement.style.setProperty('--widget-text-color', textColor);
}

function calculateAndSaveScrollbarMode() {
    // Calculate luminance to determine scrollbar color (only called when user changes widget color)
    const bgHex = appearanceSettings.widgetCustomColor;
    const bgRgb = window.TrueTab.utils.hexToRgb(bgHex);
    const hsl = window.TrueTab.utils.rgbToHsl(bgRgb.r, bgRgb.g, bgRgb.b);
    const isDarkBackground = hsl.l < 50;

    // Set scrollbar mode based on background lightness
    const newScrollbarMode = isDarkBackground ? 'light' : 'dark';
    if (appearanceSettings.widgetScrollbarMode !== newScrollbarMode) {
        appearanceSettings.widgetScrollbarMode = newScrollbarMode;
        saveAppearanceSettings();
    }

    // Apply immediately
    applyScrollbarMode();
}

function applyScrollbarMode() {
    // Just read the saved mode and apply CSS properties (no calculation for performance)
    if (appearanceSettings.widgetScrollbarMode === 'light') {
        // Dark background = light scrollbar
        document.documentElement.style.setProperty('--widget-scrollbar-thumb', 'rgba(255, 255, 255, 0.1)');
        document.documentElement.style.setProperty('--widget-scrollbar-thumb-hover', 'rgba(255, 255, 255, 0.3)');
    } else {
        // Light background = dark scrollbar
        document.documentElement.style.setProperty('--widget-scrollbar-thumb', 'rgba(0, 0, 0, 0.1)');
        document.documentElement.style.setProperty('--widget-scrollbar-thumb-hover', 'rgba(0, 0, 0, 0.3)');
    }
}

function applySettingsStyle() {
    const style = appearanceSettings.settingsStyle;
    if (style === 'light') {
        document.documentElement.style.setProperty('--settings-bg-color', '#f5f7f8');
        document.documentElement.style.setProperty('--settings-text-color', '#0F1720');
        document.documentElement.style.setProperty('--settings-close-bg', '#FFFFFF');
        document.documentElement.style.setProperty('--settings-close-text', '#0F1720');
        document.documentElement.style.setProperty('--settings-close-border', '#E65A75');
        document.documentElement.style.setProperty('--settings-save-bg', '#FFFFFF');
        document.documentElement.style.setProperty('--settings-inactive-color', '#8C8C8C');
        document.documentElement.style.setProperty('--settings-input-bg', '#FFFFFF');
        document.documentElement.style.setProperty('--settings-input-border', '#aeaeae');
    } else {
        document.documentElement.style.setProperty('--settings-bg-color', '#1c1c1c');
        document.documentElement.style.setProperty('--settings-text-color', '#ffffff');
        document.documentElement.style.setProperty('--settings-close-bg', '#1c1c1c');
        document.documentElement.style.setProperty('--settings-close-text', '#ffffff');
        document.documentElement.style.setProperty('--settings-close-border', '#ff6e89');
        document.documentElement.style.setProperty('--settings-save-bg', '#1c1c1c');
        document.documentElement.style.setProperty('--settings-inactive-color', '#999999');
        document.documentElement.style.setProperty('--settings-input-bg', '#282828');
        document.documentElement.style.setProperty('--settings-input-border', '#747474ff');
    }
    // Always apply accent color from user setting
    applyAccentColor();
}

function applyAccentColor() {
    const color = appearanceSettings.accentColor || '#81C3D7';
    document.documentElement.style.setProperty('--settings-accent-color', color);
    document.documentElement.style.setProperty('--settings-save-border', color);
}

function applyTheme(theme) {
    const themes = {
        default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minimalist: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        retro: 'linear-gradient(135deg, #fa8072 0%, #ff6347 50%, #ffa500 100%)',
        dark: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        scifi: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        bw: 'linear-gradient(135deg, #000000 0%, #434343 100%)'
    };
    document.body.style.backgroundImage = '';
    document.body.style.background = themes[theme] || themes.default;
}

function updateAppearanceControls() {
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value;
        if (el.type === 'range') {
            const pct = ((value - el.min) / (el.max - el.min)) * 100;
            el.style.setProperty('--slider-fill', pct + '%');
        }
    };
    const setChecked = (id, checked) => {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
    };
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    setValue('cornerStyleSelect', appearanceSettings.cornerStyle);
    setValue('backgroundSelect', appearanceSettings.background);
    setChecked('stretchBackgroundCheckbox', appearanceSettings.stretchBackground);
    setValue('overlaySlider', appearanceSettings.overlay);
    setValue('blurSlider', appearanceSettings.blur);
    setText('overlaySliderValue', `${appearanceSettings.overlay}%`);
    setText('blurSliderValue', `${appearanceSettings.blur}%`);
    setValue('settingsStyleSelect', appearanceSettings.settingsStyle);
    setValue('widgetOpacitySlider', appearanceSettings.widgetOpacity);
    setValue('widgetBlurSlider', appearanceSettings.widgetBlur);
    setText('widgetOpacitySliderValue', `${appearanceSettings.widgetOpacity}%`);
    setText('widgetBlurSliderValue', `${appearanceSettings.widgetBlur}%`);
    setValue('widgetColorInput', appearanceSettings.widgetCustomColor);
    setValue('widgetHexInput', appearanceSettings.widgetCustomColor.toUpperCase());
    setValue('widgetIconColorInput', appearanceSettings.widgetCustomIconColor);
    setValue('widgetIconHexInput', appearanceSettings.widgetCustomIconColor.toUpperCase());
    setValue('widgetTextColorInput', appearanceSettings.widgetCustomTextColor);
    setValue('widgetTextHexInput', appearanceSettings.widgetCustomTextColor.toUpperCase());
    setChecked('hideBottomMenuWhenNotHovered', appearanceSettings.hideBottomMenuWhenNotHovered);
    setChecked('enableRubberBandScrolling', appearanceSettings.enableRubberBandScrolling);
    setChecked('showAppTitles', appearanceSettings.hideAppTitles);  // Inverted: showAppTitles checkbox reflects hideAppTitles value
    setChecked('hideAllGlassBG', appearanceSettings.hideAllGlassBG);
    setValue('accentColorInput', appearanceSettings.accentColor || '#81C3D7');
    setValue('accentHexInput', (appearanceSettings.accentColor || '#81C3D7').toUpperCase());
    setValue('fontSelect', appearanceSettings.font);
    const uploadGroup = document.getElementById('customFontUploadGroup');
    if (uploadGroup) {
        uploadGroup.style.display = appearanceSettings.font === 'custom' ? 'block' : 'none';
    }
    const fontPreview = document.getElementById('customFontPreview');
    const fontNameEl = document.getElementById('customFontName');
    if (appearanceSettings.customFont && fontPreview && fontNameEl && appearanceSettings.customFontName) {
        fontNameEl.textContent = `Font: ${appearanceSettings.customFontName}`;
        fontPreview.style.display = 'block';
    } else if (fontPreview) {
        fontPreview.style.display = 'none';
    }
    const preview = document.getElementById('customBackgroundPreview');
    const previewImg = document.getElementById('customBackgroundPreviewImg');
    if (appearanceSettings.customBackground && preview && previewImg) {
        previewImg.src = appearanceSettings.customBackground;
        preview.style.display = 'block';
    } else if (preview) {
        preview.style.display = 'none';
    }
}

const appearanceChangeHandlers = {
    cornerStyleSelect: (e) => {
        appearanceSettings.cornerStyle = e.target.value;
        saveAppearanceSettings();
        applyAppearanceSettings();
    },
    settingsStyleSelect: (e) => {
        appearanceSettings.settingsStyle = e.target.value;
        saveAppearanceSettings();
        applySettingsStyle();
    },
    backgroundSelect: (e) => {
        appearanceSettings.background = e.target.value;
        appearanceSettings.customBackground = null;
        saveAppearanceSettings();
        applyAppearanceSettings();
    },
    stretchBackgroundCheckbox: (e) => {
        appearanceSettings.stretchBackground = e.target.checked;
        saveAppearanceSettings();
        applyAppearanceSettings();
    },
    hideBottomMenuWhenNotHovered: (e) => {
        appearanceSettings.hideBottomMenuWhenNotHovered = e.target.checked;
        saveAppearanceSettings();
        applyAppearanceSettings();
    },
    enableRubberBandScrolling: (e) => {
        appearanceSettings.enableRubberBandScrolling = e.target.checked;
        saveAppearanceSettings();
        window.location.reload();
    },
    hideAppTitles: (e) => {
        appearanceSettings.hideAppTitles = e.target.checked;
        saveAppearanceSettings();
        applyAppearanceSettings();
    },
    showAppTitles: (e) => {
        // Inverted logic: when checkbox is checked (true), hideAppTitles = true (show)
        appearanceSettings.hideAppTitles = e.target.checked;
        saveAppearanceSettings();
        applyAppearanceSettings();
    },
    hideAllGlassBG: (e) => {
        appearanceSettings.hideAllGlassBG = e.target.checked;
        saveAppearanceSettings();
        applyAppearanceSettings();
    },
    accentColorInput: (e) => {
        appearanceSettings.accentColor = e.target.value;
        const hexInput = document.getElementById('accentHexInput');
        if (hexInput) hexInput.value = e.target.value.toUpperCase();
        saveAppearanceSettings();
        applyAccentColor();
    },
    accentHexInput: (e) => {
        let hex = e.target.value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-F]{6}$/i.test(hex)) {
            appearanceSettings.accentColor = hex;
            const colorInput = document.getElementById('accentColorInput');
            if (colorInput) colorInput.value = hex;
            saveAppearanceSettings();
            applyAccentColor();
        }
    },
    overlaySlider: () => saveAppearanceSettings(),
    blurSlider: () => saveAppearanceSettings(),
    widgetOpacitySlider: () => saveAppearanceSettings(),
    widgetBlurSlider: () => saveAppearanceSettings(),
    widgetColorInput: (e) => {
        appearanceSettings.widgetCustomColor = e.target.value;
        const hexInput = document.getElementById('widgetHexInput');
        if (hexInput) hexInput.value = e.target.value.toUpperCase();
        calculateAndSaveScrollbarMode();
        applyWidgetStyle();
    },
    widgetHexInput: (e) => {
        let hex = e.target.value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-F]{6}$/i.test(hex)) {
            appearanceSettings.widgetCustomColor = hex;
            const colorInput = document.getElementById('widgetColorInput');
            if (colorInput) colorInput.value = hex;
            calculateAndSaveScrollbarMode();
            applyWidgetStyle();
        }
    },
    widgetIconColorInput: (e) => {
        appearanceSettings.widgetCustomIconColor = e.target.value;
        const hexInput = document.getElementById('widgetIconHexInput');
        if (hexInput) hexInput.value = e.target.value.toUpperCase();
        saveAppearanceSettings();
        // Update CSS variable immediately for iconify icons and SVGs
        document.documentElement.style.setProperty('--widget-icon-color', e.target.value);
        // Apply filters to uploaded image icons
        window.TrueTab.utils.applyIconColorFilters();
    },
    widgetIconHexInput: (e) => {
        let hex = e.target.value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-F]{6}$/i.test(hex)) {
            appearanceSettings.widgetCustomIconColor = hex;
            const colorInput = document.getElementById('widgetIconColorInput');
            if (colorInput) colorInput.value = hex;
            saveAppearanceSettings();
            // Update CSS variable immediately for iconify icons and SVGs
            document.documentElement.style.setProperty('--widget-icon-color', hex);
            // Apply filters to uploaded image icons
            window.TrueTab.utils.applyIconColorFilters();
        }
    },
    widgetTextColorInput: (e) => {
        appearanceSettings.widgetCustomTextColor = e.target.value;
        const hexInput = document.getElementById('widgetTextHexInput');
        if (hexInput) hexInput.value = e.target.value.toUpperCase();
        saveAppearanceSettings();
        applyWidgetStyle();
    },
    widgetTextHexInput: (e) => {
        let hex = e.target.value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-F]{6}$/i.test(hex)) {
            appearanceSettings.widgetCustomTextColor = hex;
            const colorInput = document.getElementById('widgetTextColorInput');
            if (colorInput) colorInput.value = hex;
            saveAppearanceSettings();
            applyWidgetStyle();
        }
    },
    customBackgroundUpload: (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            e.target.value = '';
            return;
        }

        // For larger files, compress the image
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Create canvas for compression
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Set max dimensions while maintaining aspect ratio
                const maxWidth = 1920;
                const maxHeight = 1080;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG with quality 0.9 (or PNG if transparency is needed)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

                appearanceSettings.customBackground = dataUrl;
                appearanceSettings.background = 'custom';
                saveAppearanceSettings();
                applyAppearanceSettings();
                const bgStyleSelect = document.getElementById('bgStyleSelect');
                if (bgStyleSelect) bgStyleSelect.value = 'custom';
            };
            img.onerror = () => {
                console.error('Error loading image');
                alert('Error loading image. Please try a different file.');
                e.target.value = '';
            };
            img.src = event.target.result;
        };
        reader.onerror = () => {
            console.error('Error reading file');
            alert('Error loading image. Please try a different file.');
            e.target.value = '';
        };
        reader.readAsDataURL(file);
    },
    fontSelect: (e) => {
        const selectedFont = e.target.value;
        appearanceSettings.font = selectedFont;

        // Clear font cache when changing fonts
        if (window.TrueTab.clearFontCache) {
            window.TrueTab.clearFontCache();
        }

        const uploadGroup = document.getElementById('customFontUploadGroup');
        if (uploadGroup) {
            uploadGroup.style.display = selectedFont === 'custom' ? 'block' : 'none';
        }
        if (selectedFont !== 'custom') {
            saveAppearanceSettings();
            applyFont();
        }
    },
    customFontUpload: (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
        const fileName = file.name.toLowerCase();
        const isValidFont = validExtensions.some(ext => fileName.endsWith(ext));
        if (!isValidFont) {
            alert('Please select a valid font file (.ttf, .otf, .woff, or .woff2)');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            appearanceSettings.customFont = event.target.result;
            appearanceSettings.customFontName = file.name.replace(/\.[^/.]+$/, '');
            appearanceSettings.font = 'custom';

            // Clear font cache for new custom font
            if (window.TrueTab.clearFontCache) {
                window.TrueTab.clearFontCache();
            }

            saveAppearanceSettings();
            applyFont();
            const preview = document.getElementById('customFontPreview');
            const nameEl = document.getElementById('customFontName');
            if (preview && nameEl) {
                nameEl.textContent = `Font: ${file.name}`;
                preview.style.display = 'block';
            }
        };
        reader.onerror = () => {
            console.error('Error reading font file');
            alert('Error loading font file. Please try a different file.');
            e.target.value = '';
        };
        reader.readAsDataURL(file);
    }
};

const appearanceInputHandlers = {
    overlaySlider: (e) => {
        const value = parseInt(e.target.value);
        appearanceSettings.overlay = value;
        const overlayValue = document.getElementById('overlaySliderValue');
        if (overlayValue) overlayValue.textContent = `${value}%`;
        document.documentElement.style.setProperty('--bg-overlay', value / 100);
    },
    blurSlider: (e) => {
        const value = parseInt(e.target.value);
        appearanceSettings.blur = value;
        const blurValue = document.getElementById('blurSliderValue');
        if (blurValue) blurValue.textContent = `${value}%`;
        document.documentElement.style.setProperty('--bg-blur', `${value}px`);
    },
    widgetOpacitySlider: (e) => {
        const value = parseInt(e.target.value);
        appearanceSettings.widgetOpacity = value;
        const opacityValue = document.getElementById('widgetOpacitySliderValue');
        if (opacityValue) opacityValue.textContent = `${value}%`;
        // Update both opacity variable and recalculate widget background color with new opacity
        const opacity = value / 100;
        document.documentElement.style.setProperty('--widget-bg-opacity', opacity);
        const bgHex = appearanceSettings.widgetCustomColor;
        const bgRgb = window.TrueTab.utils.hexToRgb(bgHex);
        const bgColor = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${opacity})`;
        document.documentElement.style.setProperty('--widget-bg-color', bgColor);
    },
    widgetBlurSlider: (e) => {
        const value = parseInt(e.target.value);
        appearanceSettings.widgetBlur = value;
        const blurValue = document.getElementById('widgetBlurSliderValue');
        if (blurValue) blurValue.textContent = `${value}%`;
        document.documentElement.style.setProperty('--widget-bg-blur', `${value}px`);
    }
};

function initializeAppearanceListeners() {
    const settingsModal = document.getElementById('settingsModal');
    if (!settingsModal) return;

    settingsModal.addEventListener('change', (e) => {
        const handler = appearanceChangeHandlers[e.target.id];
        if (handler) handler(e);
    });

    settingsModal.addEventListener('input', (e) => {
        if (e.target.classList.contains('settings-slider')) {
            const pct = ((e.target.value - e.target.min) / (e.target.max - e.target.min)) * 100;
            e.target.style.setProperty('--slider-fill', pct + '%');
        }
        const handler = appearanceInputHandlers[e.target.id];
        if (handler) handler(e);
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target.id === 'removeCustomBackground' || e.target.closest('#removeCustomBackground')) {
            appearanceSettings.customBackground = null;
            const upload = document.getElementById('customBackgroundUpload');
            if (upload) upload.value = '';
            saveAppearanceSettings();
            applyAppearanceSettings();
        }
        if (e.target.id === 'removeCustomFont' || e.target.closest('#removeCustomFont')) {
            appearanceSettings.customFont = null;
            appearanceSettings.customFontName = null;
            appearanceSettings.font = 'default';
            const upload = document.getElementById('customFontUpload');
            const select = document.getElementById('fontSelect');
            const uploadGroup = document.getElementById('customFontUploadGroup');
            if (upload) upload.value = '';
            if (select) select.value = 'default';
            if (uploadGroup) uploadGroup.style.display = 'none';
            saveAppearanceSettings();
            applyFont();
            updateAppearanceControls();
        }
    });
}

// Initialize listeners when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAppearanceListeners);
} else {
    initializeAppearanceListeners();
}

/**
 * Cache current settings before opening modal
 * Allows for cancel/discard functionality
 */
function cacheSettingsForCancel() {
    tempAppearanceSettings = JSON.parse(JSON.stringify(appearanceSettings));
    isModalActive = true;
}

/**
 * Discard changes and restore from cache
 * Called when user clicks "Close" button
 */
function discardSettingsChanges() {
    if (tempAppearanceSettings) {
        // Restore settings from cache
        Object.assign(appearanceSettings, tempAppearanceSettings);

        // Re-apply settings to revert visual changes
        applyAppearanceSettings();

        // Clear cache
        tempAppearanceSettings = null;
    }
    isModalActive = false;
}

/**
 * Commit changes to localStorage
 * Called when user clicks "Save" button
 */
function commitSettingsChanges() {
    // Force save to localStorage
    localStorage.setItem('truetab-appearance', JSON.stringify(appearanceSettings));

    // Clear cache
    tempAppearanceSettings = null;
    isModalActive = false;
}

/**
 * Check if glass background should be hidden globally
 * @returns {boolean} true if glass BG should be hidden
 */
function shouldHideGlassBG() {
    return appearanceSettings.hideAllGlassBG;
}

window.TrueTab.appearanceSettings = appearanceSettings;
window.TrueTab.fontOptions = fontOptions;
window.TrueTab.loadAppearanceSettings = loadAppearanceSettings;
window.TrueTab.saveAppearanceSettings = saveAppearanceSettings;
window.TrueTab.applyAppearanceSettings = applyAppearanceSettings;
window.TrueTab.applyFont = applyFont;
window.TrueTab.applyWidgetStyle = applyWidgetStyle;
window.TrueTab.applySettingsStyle = applySettingsStyle;
window.TrueTab.applyAccentColor = applyAccentColor;
window.TrueTab.applyTheme = applyTheme;
window.TrueTab.updateAppearanceControls = updateAppearanceControls;
window.TrueTab.calculateAndSaveScrollbarMode = calculateAndSaveScrollbarMode;
window.TrueTab.applyScrollbarMode = applyScrollbarMode;
window.TrueTab.cacheSettingsForCancel = cacheSettingsForCancel;
window.TrueTab.discardSettingsChanges = discardSettingsChanges;
window.TrueTab.commitSettingsChanges = commitSettingsChanges;
window.TrueTab.shouldHideGlassBG = shouldHideGlassBG;