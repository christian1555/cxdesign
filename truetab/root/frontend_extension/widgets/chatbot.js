// Chatbot Widget
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules.chatbot = {
    barMeta: {
        id: 'chatbot',
        name: 'AI Chat',
        icon: 'mdi:chat-outline',
        testMode: false
    },

    // Per-widget conversation state (keyed by widget ID, not element)
    stateById: new Map(),

    // Markdown renderer (initialized lazily)
    _mdRenderer: null,

    // Model options per provider (shared with settings.js)
    modelsByProvider: {
        openai: [
            { value: 'gpt-5', label: 'GPT-5' },
            { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
            { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
            { value: 'gpt-4o', label: 'GPT-4o' },
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini' }
        ],
        anthropic: [
            { value: 'claude-sonnet-4-5', label: 'Claude 4.5 Sonnet' },
            { value: 'claude-haiku-4-5', label: 'Claude 4.5 Haiku' },
            { value: 'claude-opus-4-1', label: 'Claude 4.1 Opus' }
        ],
        gemini: [
            { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
            { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
            { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
            { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
        ],
        groq: [
            { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Versatile)' },
            { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Instant)' },
            { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (32K)' }
        ],
        xai: [
            { value: 'grok-4', label: 'Grok 4' },
            { value: 'grok-4-fast', label: 'Grok 4 Fast' },
            { value: 'grok-code-fast-1', label: 'Grok Code Fast 1' }
        ],
        mistral: [
            { value: 'mistral-large-latest', label: 'Mistral Large (latest)' },
            { value: 'mistral-medium-3.1', label: 'Mistral Medium 3.1' },
            { value: 'mistral-small-3.2', label: 'Mistral Small 3.2' },
            { value: 'codestral-latest', label: 'Codestral (coding)' }
        ],
        openrouter: [
            { value: 'openrouter/auto', label: 'Auto (OpenRouter)' },
            { value: 'openai/gpt-5', label: 'GPT-5 (via OpenRouter)' },
            { value: 'anthropic/claude-4.5-sonnet', label: 'Claude 4.5 Sonnet (via OR)' },
            { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (via OR)' },
            { value: 'x-ai/grok-4', label: 'Grok 4 (via OR)' },
            { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (via OR)' }
        ]
    },

    defaults: {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        temperature: 0.2,
        systemPrompt: 'You are a concise, helpful assistant.',
        maxHistory: 12,
        chatWindowSize: 'default', // small: 220px, medium: 270px, default: 320px, large: 370px, xlarge: 420px
        placeholder: ''
    },

    render: function(settings = {}) {
        const cfg = { ...this.defaults, ...settings };

        const models = this.modelsByProvider[cfg.provider] || [];
        const modelOptions = models.map(m =>
            `<option value="${m.value}" ${m.value === cfg.model ? 'selected' : ''}>${m.label}</option>`
        ).join('');

        return `
            <div class="chatbot-widget-container">
                <div class="chatbot-blur-layer"></div>
                <div class="chatbot-border-layer">
                    <input type="text" class="cb-input" placeholder="${cfg.placeholder}" autocomplete="off">
                    <div class="cb-floating-controls">
                        <select class="cb-provider">
                            <option value="openai" ${cfg.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
                            <option value="anthropic" ${cfg.provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
                            <option value="gemini" ${cfg.provider === 'gemini' ? 'selected' : ''}>Gemini</option>
                            <option value="groq" ${cfg.provider === 'groq' ? 'selected' : ''}>Groq</option>
                            <option value="xai" ${cfg.provider === 'xai' ? 'selected' : ''}>xAI</option>
                            <option value="mistral" ${cfg.provider === 'mistral' ? 'selected' : ''}>Mistral</option>
                            <option value="openrouter" ${cfg.provider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                        </select>
                        <select class="cb-model">${modelOptions}</select>
                    </div>
                    <button class="cb-send">
                        <span class="iconify" data-icon="mdi:send"></span>
                    </button>
                </div>
            </div>
        `;
    },

    _getSizeHeight(size) {
        const sizes = {
            'small': 220,
            'medium': 270,
            'default': 320,
            'large': 370,
            'xlarge': 420
        };
        return sizes[size] || 320;
    },

    _getNextSize(currentSize, direction) {
        const order = ['small', 'medium', 'default', 'large', 'xlarge'];
        const currentIndex = order.indexOf(currentSize);
        if (direction === 'increase') {
            return currentIndex < order.length - 1 ? order[currentIndex + 1] : currentSize;
        } else {
            return currentIndex > 0 ? order[currentIndex - 1] : currentSize;
        }
    },

    update: async function(element, settings = {}, force = false) {
        const widgetId = element.id || element.dataset.widgetId;
        if (!widgetId) {
            console.error('Chatbot widget missing ID');
            return;
        }

        // Check if widget is in edit mode - if so, skip initialization
        const isEditMode = window.TrueTab && window.TrueTab.editMode;
        if (isEditMode && !force) {
            return;
        }

        // Initialize state per widget ID (or reuse existing state)
        const existingState = this.stateById.get(widgetId);
        if (!existingState) {
            const cfg = { ...this.defaults, ...settings };

            // Migrate old model names (remove -latest suffix)
            const originalModel = cfg.model;
            if (cfg.model) {
                cfg.model = cfg.model.replace(/-latest$/, '');
            }

            // If model was migrated, save it
            if (originalModel !== cfg.model) {
                const widget = window.TrueTab.getWidgetById(widgetId);
                if (widget) {
                    widget.settings.model = cfg.model;
                    window.TrueTab.saveWidgets(false);
                }
            }

            this.stateById.set(widgetId, {
                config: cfg,
                messages: [{ role: 'system', content: cfg.systemPrompt }],
                isExpanded: false
            });

            // initial render
            element.innerHTML = this.render(cfg);

            // Create expanded container as a sibling to the widget (outside grid container)
            let expandedContainer = document.getElementById(`chatbot-expanded-${widgetId}`);
            if (!expandedContainer) {
                expandedContainer = document.createElement('div');
                expandedContainer.id = `chatbot-expanded-${widgetId}`;
                expandedContainer.className = 'chatbot-expanded chatbot-expanded-overlay';
                expandedContainer.style.display = 'none';
                expandedContainer.innerHTML = `
                    <div class="chatbot-blur-layer"></div>
                    <div class="chatbot-border-layer suggestion-box">
                        <div class="cb-size-controls">
                            <button class="cb-size-btn cb-decrease" title="Decrease size">−</button>
                            <button class="cb-size-btn cb-increase" title="Increase size">+</button>
                            <button class="cb-size-btn cb-clear" title="Clear conversation">
                                <span class="iconify" data-icon="mdi:trash-can-outline"></span>
                            </button>
                        </div>
                        <div class="cb-messages suggestion-scroller">
                            <!-- messages go here -->
                        </div>
                    </div>
                `;
                document.body.appendChild(expandedContainer);
            }

            // Get DOM elements
            const selProvider = element.querySelector('.cb-provider');
            const selModel = element.querySelector('.cb-model');
            const inputEl = element.querySelector('.cb-input');
            const btnSend = element.querySelector('.cb-send');
            const msgsEl = expandedContainer.querySelector('.cb-messages');
            const floatingControls = element.querySelector('.cb-floating-controls');
            const btnIncrease = expandedContainer.querySelector('.cb-increase');
            const btnDecrease = expandedContainer.querySelector('.cb-decrease');
            const btnClear = expandedContainer.querySelector('.cb-clear');

            // Ensure the dropdowns reflect the current state
            if (selProvider) selProvider.value = cfg.provider;
            if (selModel) {
                // Verify the model exists in the dropdown options
                const modelExists = Array.from(selModel.options).some(opt => opt.value === cfg.model);
                if (modelExists) {
                    selModel.value = cfg.model;
                } else {
                    // Model doesn't exist, use first option
                    const models = this.modelsByProvider[cfg.provider] || [];
                    if (models.length > 0) {
                        selModel.value = models[0].value;
                        cfg.model = models[0].value;
                        // Update state
                        const state = this.stateById.get(widgetId);
                        if (state) state.config.model = models[0].value;
                    }
                }
            }

            // Expand/collapse functions
            const expand = () => {
                const state = this.stateById.get(widgetId);
                state.isExpanded = true;

                // Position using global suggestion box positioning
                if (window.TrueTab.positionSuggestionBox) {
                    window.TrueTab.positionSuggestionBox(expandedContainer, element);
                }

                // Set height based on chatWindowSize setting, capped to available space
                const height = this._getSizeHeight(state.config.chatWindowSize);
                const availableHeight = parseInt(expandedContainer.style.maxHeight) || 600;
                const cappedHeight = Math.min(height, availableHeight);
                expandedContainer.style.minHeight = `${cappedHeight}px`;
                expandedContainer.style.maxHeight = `${cappedHeight}px`;

                expandedContainer.style.display = 'block';
                this._scrollToBottom(msgsEl);

                // Add click-outside listener after a small delay to prevent immediate close
                setTimeout(() => {
                    document.addEventListener('click', handleClickOutside);
                }, 100);
            };

            const collapse = () => {
                const state = this.stateById.get(widgetId);
                state.isExpanded = false;
                expandedContainer.style.display = 'none';

                // Remove click-outside listener
                document.removeEventListener('click', handleClickOutside);
            };

            // Click outside handler
            const handleClickOutside = (e) => {
                const state = this.stateById.get(widgetId);
                if (!state || !state.isExpanded) return;

                // Check if click is outside both the expanded container and the input area
                const clickedInside = expandedContainer.contains(e.target) ||
                                     element.querySelector('.chatbot-widget-container').contains(e.target);

                if (!clickedInside) {
                    collapse();
                }
            };

            // Show conversation when clicking on input (if there are messages)
            inputEl.addEventListener('focus', () => {
                const state = this.stateById.get(widgetId);
                // Only expand if there are messages beyond the system prompt
                if (state && state.messages && state.messages.length > 1) {
                    expand();
                }
            });

            // Size control buttons
            btnIncrease.addEventListener('click', (e) => {
                e.stopPropagation();
                const state = this.stateById.get(widgetId);
                const newSize = this._getNextSize(state.config.chatWindowSize, 'increase');
                if (newSize !== state.config.chatWindowSize) {
                    state.config.chatWindowSize = newSize;
                    const height = this._getSizeHeight(newSize);
                    expandedContainer.style.minHeight = `${height}px`;
                    expandedContainer.style.maxHeight = `${height}px`;

                    // Save to settings
                    const widget = window.TrueTab.getWidgetById(widgetId);
                    if (widget) {
                        widget.settings.chatWindowSize = newSize;
                        window.TrueTab.saveWidgets(false);
                    }
                }
            });

            btnDecrease.addEventListener('click', (e) => {
                e.stopPropagation();
                const state = this.stateById.get(widgetId);
                const newSize = this._getNextSize(state.config.chatWindowSize, 'decrease');
                if (newSize !== state.config.chatWindowSize) {
                    state.config.chatWindowSize = newSize;
                    const height = this._getSizeHeight(newSize);
                    expandedContainer.style.minHeight = `${height}px`;
                    expandedContainer.style.maxHeight = `${height}px`;

                    // Save to settings
                    const widget = window.TrueTab.getWidgetById(widgetId);
                    if (widget) {
                        widget.settings.chatWindowSize = newSize;
                        window.TrueTab.saveWidgets(false);
                    }
                }
            });

            // Clear conversation button
            btnClear.addEventListener('click', (e) => {
                e.stopPropagation();
                const state = this.stateById.get(widgetId);

                // Reset messages to just the system prompt
                state.messages = [
                    { role: 'system', content: state.config.systemPrompt }
                ];

                // Clear the messages display
                msgsEl.innerHTML = '';

                // Collapse the chat window since there's nothing to show
                collapse();
            });

            // Send button opacity effect based on input value
            const updateSendButtonOpacity = () => {
                const hasText = inputEl.value.trim().length > 0;
                btnSend.style.opacity = hasText ? '1' : '0.3';
            };

            inputEl.addEventListener('input', updateSendButtonOpacity);
            updateSendButtonOpacity(); // Set initial state

            // Floating controls opacity is handled by CSS (.cb-floating-controls:hover)

            const send = async () => {
                const text = (inputEl.value || '').trim();
                if (!text) return;

                // Expand chat window
                expand();

                inputEl.value = '';
                updateSendButtonOpacity();

                await this._pushUserAndCall(element, text, expandedContainer);
                this._scrollToBottom(msgsEl);
            };

            btnSend.addEventListener('click', send);
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                } else if (e.key === 'Escape') {
                    collapse();
                    inputEl.blur();
                }
            });

            // When provider changes
            selProvider.addEventListener('change', () => {
                const state = this.stateById.get(widgetId);
                const newProvider = selProvider.value;
                state.config.provider = newProvider;

                // Update model dropdown with new provider's models
                const models = this.modelsByProvider[newProvider] || [];
                selModel.innerHTML = models.map(m =>
                    `<option value="${m.value}">${m.label}</option>`
                ).join('');

                // Set default model for new provider
                if (models.length > 0) {
                    state.config.model = models[0].value;
                    selModel.value = models[0].value;
                }

                // Save to settings
                const widget = window.TrueTab.getWidgetById(widgetId);
                if (widget) {
                    widget.settings.provider = newProvider;
                    widget.settings.model = state.config.model;
                    window.TrueTab.saveWidgets(false);
                }
            });

            // When model changes
            selModel.addEventListener('change', () => {
                const state = this.stateById.get(widgetId);
                state.config.model = selModel.value;

                // Save to settings
                const widget = window.TrueTab.getWidgetById(widgetId);
                if (widget) {
                    widget.settings.model = selModel.value;
                    window.TrueTab.saveWidgets(false);
                }
            });

            // Mark scrollable helper
            queueMicrotask(() => {
                if (msgsEl && msgsEl.scrollHeight > msgsEl.clientHeight) {
                    msgsEl.classList.add('is-scrollable');
                }
            });
        } else {
            // State exists - this is a re-render (from edit mode toggle, widget move, etc.)
            // Just re-render the widget content and reconnect to existing expanded container
            element.innerHTML = this.render(existingState.config);

            // Reconnect to existing expanded container
            const expandedContainer = document.getElementById(`chatbot-expanded-${widgetId}`);
            if (!expandedContainer) {
                console.error('Chatbot expanded container missing for existing state');
                return;
            }

            // Re-setup DOM references and event listeners
            const selProvider = element.querySelector('.cb-provider');
            const selModel = element.querySelector('.cb-model');
            const inputEl = element.querySelector('.cb-input');
            const btnSend = element.querySelector('.cb-send');
            const msgsEl = expandedContainer.querySelector('.cb-messages');
            const floatingControls = element.querySelector('.cb-floating-controls');
            const btnIncrease = expandedContainer.querySelector('.cb-increase');
            const btnDecrease = expandedContainer.querySelector('.cb-decrease');
            const btnClear = expandedContainer.querySelector('.cb-clear');

            // Ensure the dropdowns reflect the current state
            if (selProvider) selProvider.value = existingState.config.provider;
            if (selModel) {
                // Verify the model exists in the dropdown options
                const modelExists = Array.from(selModel.options).some(opt => opt.value === existingState.config.model);
                if (modelExists) {
                    selModel.value = existingState.config.model;
                } else {
                    // Model doesn't exist, use first option
                    const models = this.modelsByProvider[existingState.config.provider] || [];
                    if (models.length > 0) {
                        selModel.value = models[0].value;
                        existingState.config.model = models[0].value;
                    }
                }
            }

            // Need to re-create all the expand/collapse functions and event listeners
            // This is the same code as above, just for reconnection
            const expand = () => {
                const state = this.stateById.get(widgetId);
                state.isExpanded = true;
                // Position using global suggestion box positioning
                if (window.TrueTab.positionSuggestionBox) {
                    window.TrueTab.positionSuggestionBox(expandedContainer, element);
                }
                const height = this._getSizeHeight(state.config.chatWindowSize);
                const availableHeight = parseInt(expandedContainer.style.maxHeight) || 600;
                const cappedHeight = Math.min(height, availableHeight);
                expandedContainer.style.minHeight = `${cappedHeight}px`;
                expandedContainer.style.maxHeight = `${cappedHeight}px`;
                expandedContainer.style.display = 'block';
                this._scrollToBottom(msgsEl);
                setTimeout(() => { document.addEventListener('click', handleClickOutside); }, 100);
            };

            const collapse = () => {
                const state = this.stateById.get(widgetId);
                state.isExpanded = false;
                expandedContainer.style.display = 'none';
                document.removeEventListener('click', handleClickOutside);
            };

            const handleClickOutside = (e) => {
                const state = this.stateById.get(widgetId);
                if (!state || !state.isExpanded) return;
                const clickedInside = expandedContainer.contains(e.target) || element.querySelector('.chatbot-widget-container').contains(e.target);
                if (!clickedInside) { collapse(); }
            };

            inputEl.addEventListener('focus', () => {
                const state = this.stateById.get(widgetId);
                if (state && state.messages && state.messages.length > 1) { expand(); }
            });

            btnIncrease.addEventListener('click', (e) => {
                e.stopPropagation();
                const state = this.stateById.get(widgetId);
                const newSize = this._getNextSize(state.config.chatWindowSize, 'increase');
                if (newSize !== state.config.chatWindowSize) {
                    state.config.chatWindowSize = newSize;
                    const height = this._getSizeHeight(newSize);
                    expandedContainer.style.minHeight = `${height}px`;
                    expandedContainer.style.maxHeight = `${height}px`;
                    const widget = window.TrueTab.getWidgetById(widgetId);
                    if (widget) { widget.settings.chatWindowSize = newSize; window.TrueTab.saveWidgets(false); }
                }
            });

            btnDecrease.addEventListener('click', (e) => {
                e.stopPropagation();
                const state = this.stateById.get(widgetId);
                const newSize = this._getNextSize(state.config.chatWindowSize, 'decrease');
                if (newSize !== state.config.chatWindowSize) {
                    state.config.chatWindowSize = newSize;
                    const height = this._getSizeHeight(newSize);
                    expandedContainer.style.minHeight = `${height}px`;
                    expandedContainer.style.maxHeight = `${height}px`;
                    const widget = window.TrueTab.getWidgetById(widgetId);
                    if (widget) { widget.settings.chatWindowSize = newSize; window.TrueTab.saveWidgets(false); }
                }
            });

            btnClear.addEventListener('click', (e) => {
                e.stopPropagation();
                const state = this.stateById.get(widgetId);
                state.messages = [{ role: 'system', content: state.config.systemPrompt }];
                msgsEl.innerHTML = '';
                collapse();
            });

            const updateSendButtonOpacity = () => {
                const hasText = inputEl.value.trim().length > 0;
                btnSend.style.opacity = hasText ? '1' : '0.3';
            };
            inputEl.addEventListener('input', updateSendButtonOpacity);
            updateSendButtonOpacity();

            if (floatingControls) {
                floatingControls.addEventListener('mouseenter', () => { floatingControls.style.opacity = '1'; });
                floatingControls.addEventListener('mouseleave', () => { floatingControls.style.opacity = '0'; });
            }

            const send = async () => {
                const text = (inputEl.value || '').trim();
                if (!text) return;
                expand();
                inputEl.value = '';
                updateSendButtonOpacity();
                await this._pushUserAndCall(element, text, expandedContainer);
                this._scrollToBottom(msgsEl);
            };

            btnSend.addEventListener('click', send);
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                else if (e.key === 'Escape') { collapse(); inputEl.blur(); }
            });

            selProvider.addEventListener('change', () => {
                const state = this.stateById.get(widgetId);
                const newProvider = selProvider.value;
                state.config.provider = newProvider;
                const models = this.modelsByProvider[newProvider] || [];
                selModel.innerHTML = models.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
                if (models.length > 0) { state.config.model = models[0].value; selModel.value = models[0].value; }
                const widget = window.TrueTab.getWidgetById(widgetId);
                if (widget) { widget.settings.provider = newProvider; widget.settings.model = state.config.model; window.TrueTab.saveWidgets(false); }
            });

            selModel.addEventListener('change', () => {
                const state = this.stateById.get(widgetId);
                state.config.model = selModel.value;
                const widget = window.TrueTab.getWidgetById(widgetId);
                if (widget) { widget.settings.model = selModel.value; window.TrueTab.saveWidgets(false); }
            });
        }
    },

    async _pushUserAndCall(element, text, expandedContainer) {
        const widgetId = element.id || element.dataset.widgetId;
        const state = this.stateById.get(widgetId);
        // Get messages element from expanded container (passed as parameter or find it)
        const msgsEl = expandedContainer ? expandedContainer.querySelector('.cb-messages') : document.getElementById(`chatbot-expanded-${widgetId}`)?.querySelector('.cb-messages');

        // add user bubble
        this._appendBubble(msgsEl, 'user', text);

        // optimistic assistant placeholder
        const placeholder = this._appendBubble(msgsEl, 'assistant', '…thinking…');

        // trim history
        const base = state.messages.filter(m => m.role !== 'assistant' && m.role !== 'user');
        const turns = state.messages.filter(m => m.role === 'assistant' || m.role === 'user');
        const trimmed = turns.slice(-(state.config.maxHistory * 2));
        state.messages = [...base, ...trimmed, { role: 'user', content: text }];

        try {
            console.log('Chatbot: Sending request to', `${BASE_URL}chat.php`);
            console.log('Provider:', state.config.provider, 'Model:', state.config.model);

            const res = await fetch(`${BASE_URL}chat.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: state.config.provider,
                    model: state.config.model,
                    temperature: state.config.temperature,
                    messages: state.messages
                })
            });

            console.log('Chatbot: Response status:', res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Chatbot: Error response:', errorText);
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            console.log('Chatbot: Response data:', data);

            if (data.error) throw new Error(data.error);

            const assistantText = (data.text || '').trim() || '[no reply]';
            state.messages.push({ role: 'assistant', content: assistantText });

            placeholder.innerHTML = this._mdEscape(assistantText);
        } catch (e) {
            console.error('Chatbot error:', e);
            placeholder.innerHTML = `<span style="color:#ff3b30;">Error: ${this._escape(e.message)}</span>`;
        }
    },

    _appendBubble(container, role, text) {
        const isUser = role === 'user';
        const bubble = document.createElement('div');
        bubble.className = `cb-bubble cb-${role}`;
        // For user messages, escape plain text. For assistant, render markdown.
        bubble.innerHTML = isUser ? this._escape(text) : this._mdEscape(text);
        container.appendChild(bubble);
        return bubble;
    },

    _scrollToBottom(el) {
        el.scrollTop = el.scrollHeight;
    },

    _escape(s) {
        return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    },

    _initMarkdownRenderer() {
        if (this._mdRenderer) return this._mdRenderer;

        // Check if libraries are loaded
        if (typeof window.markdownit === 'undefined') {
            console.warn('markdown-it not loaded, falling back to plain text');
            return null;
        }

        // Configure Markdown-it
        this._mdRenderer = window.markdownit({
            html: true,          // allow raw HTML from the model (we'll sanitize later)
            linkify: true,       // turn URLs into links
            breaks: false,       // keep normal line breaks
            typographer: true,   // smart quotes, dashes, etc.
            highlight: function (str, lang) {
                if (typeof window.hljs !== 'undefined') {
                    try {
                        if (lang && window.hljs.getLanguage(lang)) {
                            return window.hljs.highlight(str, {language: lang}).value;
                        }
                        return window.hljs.highlightAuto(str).value;
                    } catch (e) {
                        console.error('Highlight error:', e);
                        return '';
                    }
                }
                return ''; // no highlighting if hljs not loaded
            }
        });

        // Add plugins if available
        if (typeof window.markdownItAttrs !== 'undefined') {
            this._mdRenderer.use(window.markdownItAttrs);
        }
        if (typeof window.markdownitTaskLists !== 'undefined') {
            this._mdRenderer.use(window.markdownitTaskLists, {enabled: true, label: true, labelAfter: true});
        }

        return this._mdRenderer;
    },

    _renderSpoilers(html) {
        // Discord-style spoilers: ||secret||
        // Replace pairs of ||...|| with a span. Avoid greedy matching.
        return html.replace(/(^|[^\|])\|\|([\s\S]*?)\|\|/g, (_match, pre, inner) => {
            return pre + `<span class="cb-spoiler" onclick="this.classList.toggle('revealed')">${inner}</span>`;
        });
    },

    _mdEscape(s) {
        const md = this._initMarkdownRenderer();

        // Fallback to plain escape if markdown not available
        if (!md) {
            return this._escape(s);
        }

        // 1) Parse Markdown to HTML
        let html = md.render(s);

        // 2) Post-process for spoilers
        html = this._renderSpoilers(html);

        // 3) Sanitize with DOMPurify if available
        if (typeof DOMPurify !== 'undefined') {
            html = DOMPurify.sanitize(html, {
                USE_PROFILES: { html: true },
                ADD_ATTR: ['target', 'rel'],
                FORBID_TAGS: ['iframe', 'meta', 'object', 'embed'],
            });
        }

        // 4) Force external links to open in new tab safely
        const container = document.createElement('div');
        container.innerHTML = html;
        container.querySelectorAll('a[href]').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });

        return container.innerHTML;
    },

    // Cleanup method to prevent memory leaks when widget is deleted
    cleanup: function(widgetId) {
        // Remove expanded container from DOM
        const expandedContainer = document.getElementById(`chatbot-expanded-${widgetId}`);
        if (expandedContainer) {
            expandedContainer.remove();
        }

        // Remove state from Map
        this.stateById.delete(widgetId);
    }
};
