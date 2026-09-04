/**
 * Interactive GIS Map & Inspection Heatmap Component (Leaflet.js)
 */
const gisMapComponent = {
    mapInstance: null,
    markersLayer: null,
    userLocationLayer: null,
    rawPoints: [],
    currentFilter: 'ALL',

    async render(container) {
        container.innerHTML = `
            <div class="space-y-4">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            <i data-lucide="map-pin" class="w-5 h-5 text-rose-600"></i>
                            Jurisdictional GIS Stamping & Compliance Map
                        </h2>
                        <p class="text-xs text-slate-500">Spatial distribution of verified instruments, overdue units, and enforcement hotspots</p>
                    </div>

                    <!-- Filter Chips & Locate Me -->
                    <div class="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm text-xs">
                        <button id="btnLocateUserGis" onclick="gisMapComponent.locateUser()" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1 shadow">
                            <i data-lucide="crosshair" class="w-3.5 h-3.5"></i>
                            <span>📍 Locate Me (Live GPS)</span>
                        </button>
                        <button data-filter="ALL" onclick="gisMapComponent.filterMarkers('ALL')" class="gis-filter-btn px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold shadow transition">All Units</button>
                        <button data-filter="ACTIVE" onclick="gisMapComponent.filterMarkers('ACTIVE')" class="gis-filter-btn px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold transition">🟢 Verified</button>
                        <button data-filter="DUE_FOR_REVERIFICATION" onclick="gisMapComponent.filterMarkers('DUE_FOR_REVERIFICATION')" class="gis-filter-btn px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold transition">🟠 Due Soon</button>
                        <button data-filter="EXPIRED" onclick="gisMapComponent.filterMarkers('EXPIRED')" class="gis-filter-btn px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold transition">🔴 Expired</button>
                    </div>
                </div>

                <!-- Live Location Info Banner (Shown after Locate Me) -->
                <div id="gisLiveLocationBar" class="hidden bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shadow-sm">
                    <div class="flex items-center space-x-2">
                        <span class="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                        <div id="gisLocationText" class="font-medium">Acquiring device geolocation...</div>
                    </div>
                    <button onclick="gisMapComponent.clearUserLocation()" class="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline shrink-0">
                        Reset Map View
                    </button>
                </div>

                <!-- Map Container -->
                <div class="glass-panel rounded-3xl border border-white/80 shadow-xl overflow-hidden p-2 relative">
                    <div id="leafletMap" class="w-full h-[580px] rounded-2xl z-0"></div>
                </div>
            </div>
        `;
        lucide.createIcons();

        setTimeout(() => {
            this.initMap();
        }, 150);
    },

    async initMap() {
        const mapEl = document.getElementById('leafletMap');
        if (!mapEl) return;

        if (this.mapInstance) {
            this.mapInstance.remove();
        }

        const isDark = document.documentElement.classList.contains('dark');

        // Initialize map centered around Delhi
        this.mapInstance = L.map('leafletMap').setView([28.5500, 77.2400], 12);

        // Tile layer based on theme
        const tileUrl = isDark 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        L.tileLayer(tileUrl, {
            attribution: '© OpenStreetMap contributors | e-MaapSetu GIS'
        }).addTo(this.mapInstance);

        this.markersLayer = L.layerGroup().addTo(this.mapInstance);
        this.userLocationLayer = L.layerGroup().addTo(this.mapInstance);

        try {
            this.rawPoints = await app.api('/api/analytics/gis-map-data');
            this.plotMarkers(this.rawPoints);
        } catch (e) {
            console.error("GIS data fetch error", e);
        }
    },

    plotMarkers(points) {
        if (!this.markersLayer) return;
        this.markersLayer.clearLayers();

        const colorMap = {
            ACTIVE: '#059669',               // Emerald
            DUE_FOR_REVERIFICATION: '#f59e0b',// Amber
            EXPIRED: '#e11d48',              // Rose
            PENDING_VERIFICATION: '#6366f1', // Indigo
            UNDER_INSPECTION: '#3b82f6'      // Blue
        };

        points.forEach(p => {
            const color = colorMap[p.status] || '#64748b';

            // Custom circle marker
            const marker = L.circleMarker([p.latitude, p.longitude], {
                radius: 10,
                fillColor: color,
                color: '#ffffff',
                weight: 2.5,
                opacity: 1,
                fillOpacity: 0.9
            });

            const popupHtml = `
                <div style="font-family: Inter, sans-serif; font-size: 12px; width: 220px; line-height: 1.4;">
                    <div style="font-size: 10px; font-weight: 800; color: ${color}; text-transform: uppercase;">${p.status.replace(/_/g, ' ')}</div>
                    <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">${p.category}</div>
                    <div style="font-size: 11px; font-family: monospace; color: #1e40af; font-weight: bold;">${p.uid}</div>
                    <hr style="margin: 6px 0; border: none; border-top: 1px solid #e2e8f0;" />
                    <div><b>Business:</b> ${p.owner_org}</div>
                    <div><b>Serial No:</b> <span style="font-family: monospace;">${p.serial_number}</span></div>
                    <div><b>Class:</b> ${p.accuracy_class} (${p.capacity})</div>
                    <div><b>Stamping Due:</b> ${p.next_due_date}</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 4px;">📍 ${p.address}</div>
                    ${p.certificate_no ? `
                        <button onclick="certificateViewerComponent.openCertModal('${p.certificate_no}')" style="margin-top: 8px; width: 100%; padding: 4px 8px; background: #1e3a8a; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                            View Stamped Certificate
                        </button>
                    ` : ''}
                </div>
            `;

            marker.bindPopup(popupHtml);
            this.markersLayer.addLayer(marker);
        });
    },

    filterMarkers(status) {
        this.currentFilter = status;

        // Dynamically update the blue highlight on the clicked button
        document.querySelectorAll('.gis-filter-btn').forEach(btn => {
            const filterVal = btn.getAttribute('data-filter');
            if (filterVal === status) {
                btn.className = 'gis-filter-btn px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold shadow transition';
            } else {
                btn.className = 'gis-filter-btn px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold transition';
            }
        });

        if (status === 'ALL') {
            this.plotMarkers(this.rawPoints);
        } else {
            const filtered = this.rawPoints.filter(p => p.status === status);
            this.plotMarkers(filtered);
        }
    },

    async locateUser() {
        if (!this.mapInstance) return;

        const btn = document.getElementById('btnLocateUserGis');
        const bar = document.getElementById('gisLiveLocationBar');
        const text = document.getElementById('gisLocationText');

        if (btn) {
            btn.innerHTML = `<span class="animate-spin mr-1">⌛</span> Querying Location...`;
        }

        try {
            app.showToast("Locating your device...", "info");
            const loc = await locationService.getRealLocation();

            if (bar && text) {
                bar.classList.remove('hidden');
                text.innerHTML = `<b>📍 Your Live Location:</b> ${loc.formattedAddress} <span class="text-emerald-700 font-bold ml-1">(${loc.latitude.toFixed(5)}° N, ${loc.longitude.toFixed(5)}° E)</span> • <i>${loc.source} (±${loc.accuracy}m)</i>`;
            }

            // Fly camera to user coordinates
            this.mapInstance.flyTo([loc.latitude, loc.longitude], 15, {
                animate: true,
                duration: 1.5
            });

            // Clear previous user layer
            if (this.userLocationLayer) {
                this.userLocationLayer.clearLayers();
            } else {
                this.userLocationLayer = L.layerGroup().addTo(this.mapInstance);
            }

            // Accuracy radius circle
            const circle = L.circle([loc.latitude, loc.longitude], {
                radius: Math.max(loc.accuracy, 25),
                fillColor: '#0284c7',
                fillOpacity: 0.18,
                color: '#0284c7',
                weight: 1.5,
                dashArray: '4, 4'
            });

            // Custom High-Visibility Pulsing Radar Marker
            const radarIcon = L.divIcon({
                className: 'custom-user-radar-icon',
                html: `
                    <div style="position: relative; width: 28px; height: 28px; display: flex; items-center; justify-content: center;">
                        <span style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: #0284c7; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
                        <span style="position: relative; width: 16px; height: 16px; border-radius: 9999px; background: #0369a1; border: 3px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);"></span>
                    </div>
                `,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            const userMarker = L.marker([loc.latitude, loc.longitude], { icon: radarIcon });

            userMarker.bindPopup(`
                <div style="font-family: Inter, sans-serif; font-size: 12px; line-height: 1.4; width: 220px;">
                    <div style="font-weight: 800; color: #0369a1; font-size: 13px;">📍 You Are Here</div>
                    <div style="font-size: 10px; color: #059669; font-weight: bold; margin-top: 2px;">✓ ${loc.source} (±${loc.accuracy}m)</div>
                    <div style="font-size: 11px; color: #334155; margin-top: 4px;"><b>Coordinates:</b> ${loc.latitude.toFixed(6)}° N, ${loc.longitude.toFixed(6)}° E</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 3px;">📍 ${loc.formattedAddress}</div>
                </div>
            `);

            this.userLocationLayer.addLayer(circle);
            this.userLocationLayer.addLayer(userMarker);

            setTimeout(() => {
                userMarker.openPopup();
            }, 800);

            app.showToast(`Found your location! (${loc.source})`, "success");
        } catch (err) {
            console.error("GIS Locate error", err);
            app.showToast(err.message, "warning");
        } finally {
            if (btn) {
                btn.innerHTML = `<i data-lucide="crosshair" class="w-3.5 h-3.5"></i><span>📍 Locate Me (Live GPS)</span>`;
                lucide.createIcons();
            }
        }
    },

    clearUserLocation() {
        if (this.userLocationLayer) {
            this.userLocationLayer.clearLayers();
        }
        const bar = document.getElementById('gisLiveLocationBar');
        if (bar) bar.classList.add('hidden');
        if (this.mapInstance) {
            this.mapInstance.setView([28.5500, 77.2400], 12);
        }
        app.showToast("Map view reset to default center", "info");
    }
};
