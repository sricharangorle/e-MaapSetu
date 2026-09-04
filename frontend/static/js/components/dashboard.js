/**
 * Dashboard View Component for e-MaapSetu
 */
const dashboardComponent = {
    async render(container) {
        try {
            const data = await app.api('/api/analytics/dashboard-summary');
            const user = app.state.currentUser;

            let contentHtml = '';

            if (data.role === 'trader') {
                contentHtml = this.renderTraderDashboard(data, user);
            } else if (data.role === 'lmo' || data.role === 'gatc') {
                contentHtml = this.renderOfficerDashboard(data, user);
            } else {
                contentHtml = this.renderAdminDashboard(data, user);
            }

            container.innerHTML = contentHtml;
            this.initCharts(data);
        } catch (e) {
            container.innerHTML = `
                <div class="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl text-center">
                    <p class="font-bold">Failed to load dashboard data</p>
                    <p class="text-xs mt-1">${e.message}</p>
                </div>
            `;
        }
    },

    renderAdminDashboard(data, user) {
        const k = data.kpis;
        return `
            <div class="space-y-6">
                <!-- Welcome Banner -->
                <div class="glass-dark text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/15">
                    <div>
                        <span class="bg-blue-500/30 text-blue-200 text-[11px] font-bold px-3 py-1 rounded-full uppercase border border-blue-400/30 backdrop-blur-md">Executive Metrology Command Centre</span>
                        <h1 class="text-2xl font-extrabold mt-1.5">Namaste, ${user.full_name}</h1>
                        <p class="text-xs text-blue-200 mt-1">${user.organization_name} • ${user.jurisdiction_circle}, ${user.jurisdiction_district}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="dashboardComponent.triggerAlertScanner()" class="bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold px-4 py-2 rounded-xl shadow-lg transition flex items-center space-x-1.5 backdrop-blur-sm">
                            <i data-lucide="bell-ring" class="w-4 h-4"></i>
                            <span>Run Expiry Scanner</span>
                        </button>
                        <button onclick="app.navigate('applications')" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg transition flex items-center space-x-1.5 backdrop-blur-sm">
                            <i data-lucide="inbox" class="w-4 h-4"></i>
                            <span>Allocate Applications (${k.pending_applications})</span>
                        </button>
                    </div>
                </div>

                <!-- KPI Metric Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="glass-card p-5 rounded-3xl border border-white/80 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Total Instruments</p>
                            <h3 class="text-2xl font-extrabold text-slate-800 mt-1">${k.total_instruments}</h3>
                            <p class="text-[11px] text-emerald-600 font-semibold mt-1">✓ ${k.active_instruments} Verified & Active</p>
                        </div>
                        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                            <i data-lucide="sliders" class="w-6 h-6"></i>
                        </div>
                    </div>

                    <div class="glass-card p-5 rounded-3xl border border-white/80 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Re-verification Due (30d)</p>
                            <h3 class="text-2xl font-extrabold text-amber-600 mt-1">${k.due_for_reverification}</h3>
                            <p class="text-[11px] text-rose-600 font-semibold mt-1">⚠ ${k.expired_instruments} Expired Stamping</p>
                        </div>
                        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                            <i data-lucide="clock" class="w-6 h-6"></i>
                        </div>
                    </div>

                    <div class="glass-card p-5 rounded-3xl border border-white/80 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Digital Certificates</p>
                            <h3 class="text-2xl font-extrabold text-indigo-600 mt-1">${k.total_certificates_issued}</h3>
                            <p class="text-[11px] text-indigo-600 font-semibold mt-1">100% QR Tamper-Proof</p>
                        </div>
                        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                            <i data-lucide="award" class="w-6 h-6"></i>
                        </div>
                    </div>

                    <div class="glass-card p-5 rounded-3xl border border-white/80 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Statutory Revenue</p>
                            <h3 class="text-2xl font-extrabold text-emerald-600 mt-1">₹${k.total_revenue_inr.toLocaleString('en-IN')}</h3>
                            <p class="text-[11px] text-slate-500 font-semibold mt-1">Collected via Bharatkosh</p>
                        </div>
                        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                            <i data-lucide="indian-rupee" class="w-6 h-6"></i>
                        </div>
                    </div>
                </div>

                <!-- Charts Row -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="glass-panel p-5 rounded-3xl border border-white/80 shadow-sm lg:col-span-1">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-sm font-bold text-slate-800">Verification Compliance Ratio</h4>
                            <span class="text-[11px] text-slate-400">Live Status</span>
                        </div>
                        <div class="relative h-56 flex items-center justify-center">
                            <canvas id="complianceChart"></canvas>
                        </div>
                    </div>

                    <div class="glass-panel p-5 rounded-3xl border border-white/80 shadow-sm lg:col-span-2">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <h4 class="text-sm font-bold text-slate-800">Instruments by Regulated Category</h4>
                                <p class="text-xs text-slate-400">Class I-IV Scales, Weighbridges, Fuel Dispensers</p>
                            </div>
                            <button onclick="app.navigate('gis-map')" class="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                                <i data-lucide="map" class="w-3.5 h-3.5"></i> View GIS Heatmap
                            </button>
                        </div>
                        <div class="relative h-56">
                            <canvas id="categoryChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Quick Action Bar -->
                <div class="glass-panel p-5 rounded-3xl border border-white/80 shadow-sm">
                    <h4 class="text-sm font-bold text-slate-800 mb-3">Key Regulatory Modules</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button onclick="app.navigate('instruments')" class="glass-card p-3 rounded-2xl border border-white/80 hover:border-blue-500 hover:bg-blue-50/50 transition text-left">
                            <i data-lucide="sliders" class="w-5 h-5 text-blue-600 mb-2"></i>
                            <div class="text-xs font-bold text-slate-800">Instrument Registry</div>
                            <div class="text-[10px] text-slate-500">Track UID & Serial Records</div>
                        </button>
                        <button onclick="app.navigate('applications')" class="glass-card p-3 rounded-2xl border border-white/80 hover:border-blue-500 hover:bg-blue-50/50 transition text-left">
                            <i data-lucide="file-text" class="w-5 h-5 text-indigo-600 mb-2"></i>
                            <div class="text-xs font-bold text-slate-800">Applications & SLA</div>
                            <div class="text-[10px] text-slate-500">Workflow & Allocation</div>
                        </button>
                        <button onclick="app.navigate('gis-map')" class="glass-card p-3 rounded-2xl border border-white/80 hover:border-blue-500 hover:bg-blue-50/50 transition text-left">
                            <i data-lucide="map-pin" class="w-5 h-5 text-rose-600 mb-2"></i>
                            <div class="text-xs font-bold text-slate-800">GIS Inspection Map</div>
                            <div class="text-[10px] text-slate-500">District-wise Compliance</div>
                        </button>
                        <button onclick="app.navigate('enforcement')" class="glass-card p-3 rounded-2xl border border-white/80 hover:border-blue-500 hover:bg-blue-50/50 transition text-left">
                            <i data-lucide="shield-alert" class="w-5 h-5 text-amber-600 mb-2"></i>
                            <div class="text-xs font-bold text-slate-800">Vigilance & Seizures</div>
                            <div class="text-[10px] text-slate-500">Public Grievances & Raids</div>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderOfficerDashboard(data, user) {
        const k = data.kpis;
        return `
            <div class="space-y-6">
                <!-- Welcome Banner -->
                <div class="glass-dark text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/15">
                    <div>
                        <span class="bg-amber-500/20 text-amber-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase border border-amber-400/30 backdrop-blur-md">Field Legal Metrology Officer Console</span>
                        <h1 class="text-2xl font-extrabold mt-1.5">${user.full_name}</h1>
                        <p class="text-xs text-blue-200 mt-1">${user.designation} • ${k.jurisdiction}</p>
                    </div>
                    <button onclick="app.navigate('field-inspection')" class="bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold px-5 py-3 rounded-2xl shadow-xl transition flex items-center space-x-2 backdrop-blur-md">
                        <i data-lucide="clipboard-check" class="w-5 h-5"></i>
                        <span>Open Field Inspection Tool</span>
                    </button>
                </div>

                <!-- Officer KPIs -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="glass-card p-5 rounded-3xl border border-white/80 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Pending Inspections</p>
                            <h3 class="text-2xl font-extrabold text-amber-600 mt-1">${k.pending_inspections}</h3>
                            <p class="text-[11px] text-slate-400 mt-1">Assigned to your circle</p>
                        </div>
                        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                            <i data-lucide="clock" class="w-6 h-6"></i>
                        </div>
                    </div>

                    <div class="glass-card p-5 rounded-3xl border border-white/80 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Inspections Completed</p>
                            <h3 class="text-2xl font-extrabold text-blue-600 mt-1">${k.total_inspections_conducted}</h3>
                            <p class="text-[11px] text-slate-400 mt-1">Calibrated & Recorded</p>
                        </div>
                        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                            <i data-lucide="check-circle" class="w-6 h-6"></i>
                        </div>
                    </div>

                    <div class="glass-card p-5 rounded-3xl border border-white/80 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Certificates Stamped</p>
                            <h3 class="text-2xl font-extrabold text-emerald-600 mt-1">${k.certificates_stamped}</h3>
                            <p class="text-[11px] text-emerald-600 font-semibold mt-1">Digital Seals Issued</p>
                        </div>
                        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                            <i data-lucide="award" class="w-6 h-6"></i>
                        </div>
                    </div>
                </div>

                <!-- Field Work Instructions -->
                <div class="glass-panel p-6 rounded-3xl border border-white/80 shadow-sm">
                    <h3 class="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <i data-lucide="info" class="w-4 h-4 text-blue-600"></i>
                        Standard Operating Procedure for Field Verification
                    </h3>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        Under Legal Metrology (General) Rules, 2011, verify instruments on-site using authenticated standard masses or volume measures. 
                        Perform Repeatability, Eccentricity, and Error of Indication tests. The e-MaapSetu mobile calculator auto-evaluates Maximum Permissible Error (MPE) tolerances, stamps digital seal numbers, captures GPS & signatures, and issues QR-enabled Form VII certificates in real-time.
                    </p>
                    <div class="mt-4 flex gap-3">
                        <button onclick="app.navigate('field-inspection')" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition">
                            Start New Inspection Test
                        </button>
                        <button onclick="app.navigate('applications')" class="glass-card hover:bg-slate-100/70 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition">
                            View Assigned Queue
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderTraderDashboard(data, user) {
        const k = data.kpis;
        return `
            <div class="space-y-6">
                <!-- Welcome Banner -->
                <div class="glass-dark text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/15">
                    <div>
                        <span class="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase border border-emerald-400/30 backdrop-blur-md">Trader / Instrument User Portal</span>
                        <h1 class="text-2xl font-extrabold mt-1.5">${user.organization_name || user.full_name}</h1>
                        <p class="text-xs text-emerald-200 mt-1">GSTIN: ${user.gstin_or_license || 'Registered'} • Contact: ${user.phone}</p>
                    </div>
                    <button onclick="instrumentListComponent.openAddModal()" class="bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold px-5 py-3 rounded-2xl shadow-xl transition flex items-center space-x-2 backdrop-blur-md">
                        <i data-lucide="plus-circle" class="w-5 h-5"></i>
                        <span>Register New Instrument</span>
                    </button>
                </div>

                <!-- Trader KPIs -->
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div class="glass-card p-5 rounded-3xl border border-white/80 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Registered Instruments</p>
                            <h3 class="text-2xl font-extrabold text-slate-800 mt-1">${k.total_instruments}</h3>
                            <p class="text-[11px] text-slate-400 mt-1">Under your business profile</p>
                        </div>
                        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                            <i data-lucide="sliders" class="w-6 h-6"></i>
                        </div>
                    </div>

                    <div class="glass-card p-5 rounded-3xl border border-white/80 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Active Valid Stamping</p>
                            <h3 class="text-2xl font-extrabold text-emerald-600 mt-1">${k.active_certificates}</h3>
                            <p class="text-[11px] text-emerald-600 font-semibold mt-1">✓ Fully Compliant</p>
                        </div>
                        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                            <i data-lucide="award" class="w-6 h-6"></i>
                        </div>
                    </div>

                    <div class="glass-card p-5 rounded-3xl border border-white/80 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Re-verification Due</p>
                            <h3 class="text-2xl font-extrabold text-amber-600 mt-1">${k.attention_required}</h3>
                            <p class="text-[11px] text-amber-600 font-semibold mt-1">Requires Action</p>
                        </div>
                        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                            <i data-lucide="alert-triangle" class="w-6 h-6"></i>
                        </div>
                    </div>

                    <div class="glass-card p-5 rounded-3xl border border-white/80 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Pending Applications</p>
                            <h3 class="text-2xl font-extrabold text-indigo-600 mt-1">${k.pending_applications}</h3>
                            <p class="text-[11px] text-slate-400 mt-1">In Verification Pipeline</p>
                        </div>
                        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                            <i data-lucide="file-text" class="w-6 h-6"></i>
                        </div>
                    </div>
                </div>

                <!-- Recent Alerts & Quick Actions -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="glass-panel p-5 rounded-3xl border border-white/80 shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                <i data-lucide="bell" class="w-4 h-4 text-amber-500"></i> Statutory Expiry Alerts
                            </h4>
                            <span class="text-[10px] text-slate-400">SMS / Email Dispatches</span>
                        </div>
                        <div class="space-y-2.5">
                            ${(data.recent_alerts && data.recent_alerts.length > 0) ? data.recent_alerts.map(a => `
                                <div class="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs backdrop-blur-sm">
                                    <div class="flex items-center justify-between font-semibold text-amber-800 mb-1">
                                        <span>${a.type.replace(/_/g, ' ')}</span>
                                        <span class="text-[10px] text-slate-400 font-normal">${a.sent_at}</span>
                                    </div>
                                    <p class="text-slate-700">${a.message}</p>
                                </div>
                            `).join('') : `
                                <p class="text-xs text-slate-400 py-4 text-center">No pending alerts. All your instruments are within valid verification periods.</p>
                            `}
                        </div>
                    </div>

                    <div class="glass-panel p-5 rounded-3xl border border-white/80 shadow-sm flex flex-col justify-between">
                        <div>
                            <h4 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                                <i data-lucide="zap" class="w-4 h-4 text-blue-600"></i> Fast Compliance Actions
                            </h4>
                            <div class="space-y-3">
                                <div class="glass-card p-3.5 rounded-2xl border border-white/80 flex items-center justify-between">
                                    <div>
                                        <div class="text-xs font-bold text-slate-800">Apply for Verification / Re-verification</div>
                                        <div class="text-[11px] text-slate-500">Schedule on-site inspection & pay statutory fees</div>
                                    </div>
                                    <button onclick="app.navigate('applications')" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow">
                                        Apply Now
                                    </button>
                                </div>
                                <div class="glass-card p-3.5 rounded-2xl border border-white/80 flex items-center justify-between">
                                    <div>
                                        <div class="text-xs font-bold text-slate-800">Download Stamping Certificates</div>
                                        <div class="text-[11px] text-slate-500">Get official QR-enabled Form VII verification certificates</div>
                                    </div>
                                    <button onclick="app.navigate('certificates')" class="glass-dark text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow">
                                        View PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    initCharts(data) {
        if (data.role !== 'admin') return;

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#f1f5f9' : '#334155';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

        // 1. Compliance Doughnut Chart
        const ctx1 = document.getElementById('complianceChart');
        if (ctx1) {
            new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: ['Active & Stamped', 'Re-verification Due', 'Expired', 'Pending Initial'],
                    datasets: [{
                        data: [
                            data.kpis.active_instruments,
                            data.kpis.due_for_reverification,
                            data.kpis.expired_instruments,
                            data.kpis.pending_initial_verification
                        ],
                        backgroundColor: ['#059669', '#f59e0b', '#e11d48', '#6366f1'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: textColor, boxWidth: 10, font: { size: 10 } } }
                    },
                    cutout: '70%'
                }
            });
        }

        // 2. Categories Bar Chart
        const ctx2 = document.getElementById('categoryChart');
        if (ctx2 && data.category_breakdown) {
            new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: data.category_breakdown.map(c => c.name.length > 20 ? c.name.substring(0, 18) + '...' : c.name),
                    datasets: [{
                        label: 'Registered Units',
                        data: data.category_breakdown.map(c => c.count),
                        backgroundColor: isDark ? '#60a5fa' : '#3b82f6',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1, font: { size: 10 } } },
                        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 9 } } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    },

    async triggerAlertScanner() {
        try {
            const res = await app.api('/api/analytics/trigger-alerts', { method: 'POST' });
            app.showToast(`Expiry scan complete! Scanned ${res.scanned_instruments_count} units. Generated ${res.new_alerts_generated} notifications.`, 'success');
            app.navigate('dashboard');
        } catch (e) {
            console.error("Alert scan error", e);
        }
    }
};
