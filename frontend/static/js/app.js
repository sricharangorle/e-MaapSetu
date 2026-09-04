/**
 * Location Service for Real Device GPS Geolocation & Reverse Geocoding
 */
const locationService = {
    /**
     * Request real device geolocation with robust multi-tiered accuracy and fallback
     */
    async getRealLocation() {
        // Tier 1: Try Native W3C Geolocation with High Accuracy (GPS / Hardware)
        if (navigator.geolocation) {
            try {
                const pos = await this._queryNavigatorGeo({ enableHighAccuracy: true, timeout: 7000, maximumAge: 0 });
                return await this._buildLocationResult(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 10, "Live Device GPS / Wi-Fi Fix");
            } catch (highAccErr) {
                console.warn("High-accuracy geolocation failed, trying standard accuracy:", highAccErr);
                try {
                    // Tier 2: Standard Accuracy (Wi-Fi / Cell Triangulation)
                    const pos = await this._queryNavigatorGeo({ enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 });
                    return await this._buildLocationResult(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 50, "Standard Device Geolocation");
                } catch (stdErr) {
                    console.warn("Standard geolocation failed, falling back to IP/Network Geolocation:", stdErr);
                }
            }
        }

        // Tier 3: Network IP Geolocation (if browser permission blocked or hardware unsupported)
        try {
            const ipRes = await fetch('https://ipapi.co/json/');
            if (ipRes.ok) {
                const ipData = await ipRes.json();
                if (ipData.latitude && ipData.longitude) {
                    const addr = `${ipData.city || ''}, ${ipData.region || ''}, ${ipData.country_name || 'India'} (Pincode: ${ipData.postal || 'N/A'})`;
                    return {
                        latitude: parseFloat(ipData.latitude),
                        longitude: parseFloat(ipData.longitude),
                        accuracy: 1500,
                        source: "Network / ISP Geolocation (City Level)",
                        formattedAddress: addr,
                        rawAddress: ipData,
                        timestamp: new Date().toISOString()
                    };
                }
            }
        } catch (ipErr) {
            console.warn("IP Geolocation fallback failed:", ipErr);
        }

        // Tier 4: Capital Territory Coordinates Fallback
        return {
            latitude: 28.6139,
            longitude: 77.2090,
            accuracy: 3000,
            source: "Default Central Coordinates",
            formattedAddress: "Connaught Place, New Delhi, Delhi, 110001, India",
            rawAddress: null,
            timestamp: new Date().toISOString()
        };
    },

    _queryNavigatorGeo(options) {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    },

    async _buildLocationResult(lat, lng, accuracy, source) {
        let displayName = `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`;
        let rawAddr = null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                headers: { 'Accept-Language': 'en' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data && data.display_name) {
                    displayName = data.display_name;
                    rawAddr = data.address;
                }
            }
        } catch (e) {
            console.warn("Reverse geocode lookup timeout/error, using coords:", e);
        }

        return {
            latitude: lat,
            longitude: lng,
            accuracy: Math.round(accuracy),
            source: source,
            formattedAddress: displayName,
            rawAddress: rawAddr,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * e-MaapSetu Core Application Router & State Manager
 */
const app = {
    state: {
        token: localStorage.getItem('emaap_token') || '',
        currentUser: null,
        currentView: 'dashboard',
        activeRole: 'admin',
        isLoading: false
    },

    async init() {
        console.log("Initializing e-MaapSetu Client Application...");
        
        // Initialize Theme (Bright / Dark Mode)
        this.initTheme();

        // If no token, switch to default demo admin
        if (!this.state.token) {
            await this.switchRole('admin');
        } else {
            await this.fetchProfile();
        }

        // Check URL for public verify path
        const path = window.location.pathname;
        if (path.startsWith('/verify/')) {
            const certNo = path.replace('/verify/', '');
            this.navigate('public-verify', { certNo: certNo });
            return;
        }

        this.navigate(this.state.currentView);
    },

    async api(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(this.state.token ? { 'Authorization': `Bearer ${this.state.token}` } : {}),
            ...options.headers
        };

        try {
            const response = await fetch(endpoint, {
                ...options,
                headers
            });

            if (response.status === 401) {
                console.warn("Session unauthorized. Re-authenticating demo user...");
                await this.switchRole(this.state.activeRole);
                return;
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || data.message || 'API request failed');
            }
            return data;
        } catch (error) {
            this.showToast(error.message, 'error');
            throw error;
        }
    },

    async fetchProfile() {
        try {
            const profile = await this.api('/api/auth/me');
            this.state.currentUser = profile;
            this.updateHeaderUI();
        } catch (e) {
            console.error("Failed to load profile", e);
        }
    },

    async switchRole(roleKey) {
        this.state.activeRole = roleKey;
        const switcher = document.getElementById('roleSwitcher');
        if (switcher) switcher.value = roleKey;

        try {
            const res = await fetch('/api/auth/switch-demo-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: roleKey })
            });
            const data = await res.json();
            this.state.token = data.access_token;
            this.state.currentUser = data.user;
            localStorage.setItem('emaap_token', data.access_token);

            this.updateHeaderUI();
            this.showToast(`Switched active profile to ${data.user.full_name} (${data.user.role.toUpperCase()})`, 'success');
            
            // Re-render current view or dashboard
            this.navigate(this.state.currentView);
        } catch (e) {
            console.error("Role switch error", e);
        }
    },

    updateHeaderUI() {
        const user = this.state.currentUser;
        if (!user) return;

        const label = document.getElementById('currentUserLabel');
        if (label) {
            label.textContent = `${user.full_name} (${user.role.toUpperCase()})`;
        }

        // Adjust visible navigation tabs per role
        const fieldInspTab = document.getElementById('navFieldInspection');
        if (fieldInspTab) {
            if (user.role === 'trader') {
                fieldInspTab.classList.add('hidden');
            } else {
                fieldInspTab.classList.remove('hidden');
            }
        }
    },

    navigate(viewName, params = {}) {
        this.state.currentView = viewName;
        
        // Update nav active classes cleanly
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const isMatch = btn.getAttribute('data-view') === viewName;
            if (isMatch) {
                btn.className = 'nav-btn px-3 py-1.5 rounded-md text-white bg-white/20 font-bold shadow-sm ring-1 ring-white/30 transition flex items-center space-x-1.5';
            } else {
                btn.className = 'nav-btn px-3 py-1.5 rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition flex items-center space-x-1.5';
            }
        });

        const targetContent = document.getElementById('mainContent');
        targetContent.innerHTML = `
            <div class="flex items-center justify-center py-20">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-gov-blue"></div>
            </div>
        `;

        setTimeout(() => {
            switch(viewName) {
                case 'dashboard':
                    dashboardComponent.render(targetContent);
                    break;
                case 'instruments':
                    instrumentListComponent.render(targetContent, params);
                    break;
                case 'applications':
                    applicationWorkflowComponent.render(targetContent, params);
                    break;
                case 'field-inspection':
                    fieldInspectionComponent.render(targetContent, params);
                    break;
                case 'certificates':
                    certificateViewerComponent.render(targetContent, params);
                    break;
                case 'gis-map':
                    gisMapComponent.render(targetContent);
                    break;
                case 'enforcement':
                    enforcementComponent.render(targetContent, params);
                    break;
                case 'public-verify':
                    publicVerifierComponent.render(targetContent, params);
                    break;
                default:
                    dashboardComponent.render(targetContent);
            }
            lucide.createIcons();
        }, 80);
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        const bgColors = {
            success: 'bg-emerald-600 border-emerald-500 text-white',
            error: 'bg-rose-600 border-rose-500 text-white',
            info: 'bg-blue-600 border-blue-500 text-white',
            warning: 'bg-amber-600 border-amber-500 text-white'
        };

        const icons = {
            success: 'check-circle-2',
            error: 'alert-circle',
            info: 'info',
            warning: 'alert-triangle'
        };

        toast.className = `${bgColors[type] || bgColors.info} border px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center space-x-2.5 transition-all transform duration-300 pointer-events-auto max-w-md`;
        toast.innerHTML = `
            <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        lucide.createIcons();

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    openModal(htmlContent) {
        const container = document.getElementById('modalContainer');
        container.innerHTML = `
            <div class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" onclick="if(event.target === this) app.closeModal()">
                <div class="glass-modal rounded-3xl shadow-2xl max-w-3xl w-full border border-white/80 overflow-hidden my-8 transform transition-all animate-in fade-in zoom-in duration-200">
                    ${htmlContent}
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    closeModal() {
        const container = document.getElementById('modalContainer');
        container.innerHTML = '';
    },

    initTheme() {
        const savedTheme = localStorage.getItem('emaap_theme') || 'light';
        this.setTheme(savedTheme, false);
    },

    toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
        const nextTheme = isDark ? 'light' : 'dark';
        this.setTheme(nextTheme, true);
    },

    setTheme(theme, showNotification = false) {
        const root = document.documentElement;
        const body = document.body;
        const iconSlot = document.getElementById('themeIconSlot');
        const labelText = document.getElementById('themeLabelText');
        const btn = document.getElementById('themeToggleBtn');

        if (theme === 'dark') {
            root.classList.add('dark');
            body.classList.add('dark');
            if (iconSlot) {
                iconSlot.innerHTML = '<i data-lucide="sun" class="w-4 h-4 text-amber-300"></i>';
            }
            if (labelText) {
                labelText.textContent = 'Dark';
            }
            if (btn) {
                btn.setAttribute('title', 'Switch to Bright Mode');
            }
        } else {
            root.classList.remove('dark');
            body.classList.remove('dark');
            if (iconSlot) {
                iconSlot.innerHTML = '<i data-lucide="moon" class="w-4 h-4 text-amber-300"></i>';
            }
            if (labelText) {
                labelText.textContent = 'Light';
            }
            if (btn) {
                btn.setAttribute('title', 'Switch to Dark Mode');
            }
        }

        localStorage.setItem('emaap_theme', theme);

        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }

        if (showNotification) {
            this.showToast(`Switched to ${theme === 'dark' ? '🌙 Cyber Dark' : '☀️ Bright Glass'} Mode`, 'info');
            
            // If on GIS map, re-initialize tiles with dark/light map theme
            if (this.state.currentView === 'gis-map' && typeof gisMapComponent !== 'undefined' && gisMapComponent.initMap) {
                gisMapComponent.initMap();
            }
        }
    }
};
