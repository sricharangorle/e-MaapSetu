/**
 * Instrument Registry & Lifecycle Tracking Component
 */
const instrumentListComponent = {
    async render(container, params = {}) {
        try {
            const instruments = await app.api('/api/instruments/');
            const user = app.state.currentUser;

            container.innerHTML = `
                <div class="space-y-6">
                    <!-- Top Bar -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 class="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                <i data-lucide="sliders" class="w-5 h-5 text-blue-600"></i>
                                Weighing & Measuring Instruments Registry
                            </h2>
                            <p class="text-xs text-slate-500">Centralized database of all regulated commercial weights and measures</p>
                        </div>
                        <button onclick="instrumentListComponent.openAddModal()" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center space-x-1.5">
                            <i data-lucide="plus-circle" class="w-4 h-4"></i>
                            <span>Register New Instrument</span>
                        </button>
                    </div>

                    <!-- Filter Bar -->
                    <div class="glass-panel p-4 rounded-3xl border border-white/80 shadow-sm flex flex-wrap items-center gap-3">
                        <div class="flex-1 min-w-[220px]">
                            <div class="relative">
                                <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
                                <input type="text" id="instSearchInput" placeholder="Search by UID, Serial No, Make, Trade use..." oninput="instrumentListComponent.filterTable()" class="w-full pl-9 pr-3 py-2 text-xs border border-white/70 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/70 backdrop-blur-sm shadow-inner">
                            </div>
                        </div>

                        <select id="instStatusFilter" onchange="instrumentListComponent.filterTable()" class="text-xs border border-white/70 rounded-xl px-3 py-2 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm">
                            <option value="">All Statuses</option>
                            <option value="ACTIVE">Active & Stamped</option>
                            <option value="DUE_FOR_REVERIFICATION">Due for Re-verification</option>
                            <option value="EXPIRED">Expired Validity</option>
                            <option value="PENDING_VERIFICATION">Pending Initial Stamping</option>
                        </select>
                    </div>

                    <!-- Instruments Table -->
                    <div class="glass-panel rounded-3xl border border-white/80 shadow-lg overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse" id="instrumentsTable">
                                <thead>
                                    <tr class="bg-slate-900/5 border-b border-slate-200/60 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <th class="py-3.5 px-4">Instrument / UID</th>
                                        <th class="py-3.5 px-4">Class & Capacity</th>
                                        <th class="py-3.5 px-4">Serial & Approval No</th>
                                        <th class="py-3.5 px-4">Owner / Premises</th>
                                        <th class="py-3.5 px-4">Validity / Stamping</th>
                                        <th class="py-3.5 px-4">Status</th>
                                        <th class="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium" id="instTableBody">
                                    ${this.renderRows(instruments)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
        } catch (e) {
            container.innerHTML = `<div class="p-6 bg-rose-50 text-rose-700 rounded-xl">Error: ${e.message}</div>`;
        }
    },

    renderRows(instruments) {
        if (!instruments || instruments.length === 0) {
            return `<tr><td colspan="7" class="py-8 text-center text-slate-400">No instruments found matching criteria.</td></tr>`;
        }

        const statusBadges = {
            ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            DUE_FOR_REVERIFICATION: 'bg-amber-50 text-amber-700 border-amber-200',
            EXPIRED: 'bg-rose-50 text-rose-700 border-rose-200',
            PENDING_VERIFICATION: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            UNDER_INSPECTION: 'bg-blue-50 text-blue-700 border-blue-200',
            REJECTED: 'bg-red-50 text-red-800 border-red-200'
        };

        return instruments.map(inst => `
            <tr class="hover:bg-slate-50/70 transition">
                <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900">${inst.category_name}</div>
                    <div class="text-[11px] text-blue-600 font-mono font-semibold">${inst.instrument_uid}</div>
                    <div class="text-[10px] text-slate-400">${inst.make} ${inst.model_name}</div>
                </td>
                <td class="py-3.5 px-4">
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mb-0.5">${inst.accuracy_class}</span>
                    <div class="text-[11px] text-slate-800 font-semibold">Max: ${inst.max_capacity} ${inst.unit}</div>
                    <div class="text-[10px] text-slate-400">e = ${inst.verification_scale_interval_e} ${inst.unit}</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-mono text-slate-800 font-semibold">${inst.serial_number}</div>
                    <div class="text-[10px] text-slate-500">Model Approval: ${inst.model_approval_no}</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-semibold text-slate-800">${inst.owner.org || inst.owner.name}</div>
                    <div class="text-[10px] text-slate-500 truncate max-w-[180px]">${inst.installation_address}</div>
                </td>
                <td class="py-3.5 px-4">
                    ${inst.next_due_date ? `
                        <div class="text-slate-800 font-semibold">Due: ${inst.next_due_date}</div>
                        <div class="text-[10px] text-slate-400">Stamped: ${inst.last_verified_date || 'N/A'}</div>
                    ` : `
                        <span class="text-slate-400 text-[11px]">Unverified / Stamping Pending</span>
                    `}
                </td>
                <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadges[inst.status] || 'bg-slate-100 text-slate-600'}">
                        ${inst.status.replace(/_/g, ' ')}
                    </span>
                </td>
                <td class="py-3.5 px-4 text-right space-x-1">
                    <button onclick="instrumentListComponent.viewHistory(${inst.id})" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="View Lifecycle History">
                        <i data-lucide="history" class="w-4 h-4"></i>
                    </button>
                    ${inst.latest_certificate_no ? `
                        <button onclick="certificateViewerComponent.openCertModal('${inst.latest_certificate_no}')" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="View Digital Certificate">
                            <i data-lucide="award" class="w-4 h-4"></i>
                        </button>
                    ` : ''}
                    <button onclick="applicationWorkflowComponent.openApplyModal(${inst.id})" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Apply for Verification">
                        <i data-lucide="file-plus" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    async filterTable() {
        const search = document.getElementById('instSearchInput').value.toLowerCase();
        const status = document.getElementById('instStatusFilter').value;

        const instruments = await app.api(`/api/instruments/?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`);
        document.getElementById('instTableBody').innerHTML = this.renderRows(instruments);
        lucide.createIcons();
    },

    async viewHistory(id) {
        try {
            const data = await app.api(`/api/instruments/${id}`);
            const inst = data.instrument;
            const owner = data.owner;

            app.openModal(`
                <div class="p-6">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                        <div>
                            <span class="text-xs text-blue-600 font-mono font-bold">${inst.instrument_uid}</span>
                            <h3 class="text-lg font-extrabold text-slate-900">${inst.category_name}</h3>
                        </div>
                        <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <!-- Tech Specs Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs mb-6">
                        <div>
                            <span class="text-[10px] text-slate-400 block font-semibold">Make & Model</span>
                            <span class="font-bold text-slate-800">${inst.make} ${inst.model_name}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-400 block font-semibold">Serial Number</span>
                            <span class="font-mono font-bold text-slate-800">${inst.serial_number}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-400 block font-semibold">Accuracy Class</span>
                            <span class="font-bold text-blue-600">${inst.accuracy_class}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-400 block font-semibold">Capacity & Interval (e)</span>
                            <span class="font-bold text-slate-800">${inst.max_capacity} ${inst.unit} (e=${inst.verification_scale_interval_e})</span>
                        </div>
                    </div>

                    <!-- Lifecycle History Timeline -->
                    <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Verification & Stamping Lifecycle</h4>
                    
                    <div class="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
                        
                        <!-- Registered Event -->
                        <div class="flex items-start space-x-3 relative">
                            <div class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 z-10">
                                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                            </div>
                            <div class="bg-white p-3 rounded-xl border border-slate-200 flex-1">
                                <div class="flex items-center justify-between font-bold text-slate-800">
                                    <span>Instrument Registered on e-MaapSetu</span>
                                    <span class="text-[10px] text-slate-400 font-normal">${inst.created_at}</span>
                                </div>
                                <p class="text-slate-500 text-[11px] mt-0.5">Model Approval: ${inst.model_approval_no} • Trade Use: ${inst.trade_use}</p>
                            </div>
                        </div>

                        <!-- Applications Timeline -->
                        ${data.applications.map(a => `
                            <div class="flex items-start space-x-3 relative">
                                <div class="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 z-10">
                                    <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200 flex-1">
                                    <div class="flex items-center justify-between font-bold text-slate-800">
                                        <span>Application ${a.application_no} (${a.type.replace(/_/g, ' ')})</span>
                                        <span class="text-[10px] text-slate-400 font-normal">${a.created_at}</span>
                                    </div>
                                    <p class="text-slate-600 text-[11px] mt-0.5">Status: <b class="text-indigo-600">${a.status}</b> • Statutory Fee: ₹${a.total_fee}</p>
                                </div>
                            </div>
                        `).join('')}

                        <!-- Certificates Timeline -->
                        ${data.certificates.map(c => `
                            <div class="flex items-start space-x-3 relative">
                                <div class="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 z-10">
                                    <i data-lucide="award" class="w-3.5 h-3.5"></i>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex-1">
                                    <div class="flex items-center justify-between font-bold text-slate-900">
                                        <span>Certificate Issued: ${c.certificate_no}</span>
                                        <span class="text-[10px] text-slate-500 font-normal">Issued ${c.issue_date}</span>
                                    </div>
                                    <p class="text-emerald-700 text-[11px] font-semibold mt-0.5">Digital Stamp ID: ${c.digital_seal_no} • Valid Until: ${c.valid_until}</p>
                                    <button onclick="certificateViewerComponent.openCertModal('${c.certificate_no}')" class="mt-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded transition">
                                        View Certificate PDF & QR
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="mt-6 flex justify-end">
                        <button onclick="app.closeModal()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition">
                            Close
                        </button>
                    </div>
                </div>
            `);
        } catch (e) {
            app.showToast(e.message, 'error');
        }
    },

    openAddModal() {
        app.openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <i data-lucide="plus-circle" class="w-5 h-5 text-blue-600"></i>
                        Register New Weighing or Measuring Instrument
                    </h3>
                    <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <form id="addInstrumentForm" onsubmit="instrumentListComponent.submitNewInstrument(event)" class="space-y-4 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Instrument Category *</label>
                            <select id="addType" onchange="instrumentListComponent.onCategoryChange(this.value)" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 bg-slate-50" required>
                                <option value="NAWI_CLASS_II">High Precision Balance (Class II - Jewelers/Lab)</option>
                                <option value="NAWI_CLASS_III" selected>Commercial Counter / Platform Scale (Class III)</option>
                                <option value="WEIGHBRIDGE">Electronic Road Weighbridge (Class III)</option>
                                <option value="FUEL_DISPENSER">Automotive Fuel Dispenser (Petrol/Diesel)</option>
                                <option value="FLOWMETER_BULK">Bulk Liquid Flowmeter (Industrial)</option>
                                <option value="NAWI_CLASS_I">Micro-balance (Class I - Special Accuracy)</option>
                            </select>
                        </div>
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Category / Display Name *</label>
                            <input type="text" id="addCategoryName" value="Digital Counter Computing Scale" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500" required>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Manufacturer Make *</label>
                            <input type="text" id="addMake" placeholder="e.g. Mettler Toledo, Essae, Eagle" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Model Name *</label>
                            <input type="text" id="addModelName" placeholder="e.g. EPS-30, DS-415" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Model Approval No. *</label>
                            <input type="text" id="addApprovalNo" placeholder="IND/08/2024/..." class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500" required>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Serial Number *</label>
                            <input type="text" id="addSerial" placeholder="Unique S/N" class="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Accuracy Class *</label>
                            <input type="text" id="addClass" value="Class III" class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 font-bold" readonly>
                        </div>
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Max Capacity *</label>
                            <input type="number" step="any" id="addMaxCap" value="30" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Verification Interval (e) *</label>
                            <input type="number" step="any" id="addEVal" value="0.005" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500" required>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Unit of Measure *</label>
                            <select id="addUnit" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 bg-slate-50">
                                <option value="kg">kg (Kilograms)</option>
                                <option value="g">g (Grams)</option>
                                <option value="ton">ton (Metric Tonnes)</option>
                                <option value="L">L (Litres)</option>
                            </select>
                        </div>
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Intended Trade Use *</label>
                            <input type="text" id="addTradeUse" placeholder="e.g. Retail Grocery, Jewel Bullion, Fuel" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500" required>
                        </div>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="font-bold text-slate-700">Installation / Shop Premises Address *</label>
                            <button type="button" id="btnDetectAddLoc" onclick="instrumentListComponent.detectLocation()" class="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 text-[11px]">
                                <i data-lucide="crosshair" class="w-3.5 h-3.5"></i>
                                <span>📍 Detect My Current Location (GPS)</span>
                            </button>
                        </div>
                        <input type="text" id="addAddress" placeholder="Full physical premises address" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500" required>
                        <div id="addLocFeedback" class="text-[10px] text-slate-500 mt-1 hidden"></div>
                        <input type="hidden" id="addLat" value="28.6139">
                        <input type="hidden" id="addLng" value="77.2090">
                    </div>

                    <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                        <button type="button" onclick="app.closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition">Cancel</button>
                        <button type="submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow transition">Save & Register</button>
                    </div>
                </form>
            </div>
        `);
        lucide.createIcons();
    },

    async detectLocation() {
        const btn = document.getElementById('btnDetectAddLoc');
        const feedback = document.getElementById('addLocFeedback');
        const addrInput = document.getElementById('addAddress');
        const latInput = document.getElementById('addLat');
        const lngInput = document.getElementById('addLng');

        if (btn) {
            btn.innerHTML = `<span class="animate-spin">⌛</span> Querying GPS...`;
        }

        try {
            app.showToast("Requesting device location...", "info");
            const loc = await locationService.getRealLocation();

            if (latInput) latInput.value = loc.latitude;
            if (lngInput) lngInput.value = loc.longitude;
            if (addrInput && loc.formattedAddress) addrInput.value = loc.formattedAddress;

            if (feedback) {
                feedback.classList.remove('hidden');
                feedback.innerHTML = `<span class="text-emerald-600 font-bold">✓ Real GPS Location Acquired:</span> ${loc.latitude.toFixed(5)}° N, ${loc.longitude.toFixed(5)}° E (Accuracy: ±${loc.accuracy}m)`;
            }
            app.showToast("Location detected and address populated!", "success");
        } catch (err) {
            console.error("GPS detect error", err);
            if (feedback) {
                feedback.classList.remove('hidden');
                feedback.innerHTML = `<span class="text-rose-600 font-semibold">${err.message}</span> (Enter address manually)`;
            }
            app.showToast(err.message, "warning");
        } finally {
            if (btn) {
                btn.innerHTML = `<i data-lucide="crosshair" class="w-3.5 h-3.5"></i><span>📍 Re-detect Location</span>`;
                lucide.createIcons();
            }
        }
    },

    onCategoryChange(val) {
        const classMap = {
            NAWI_CLASS_I: { class: 'Class I', name: 'Micro-balance Special Accuracy', unit: 'g', max: 200, e: 0.0001 },
            NAWI_CLASS_II: { class: 'Class II', name: 'High Precision Gold & Bullion Balance', unit: 'g', max: 500, e: 0.001 },
            NAWI_CLASS_III: { class: 'Class III', name: 'Commercial Counter / Platform Scale', unit: 'kg', max: 30, e: 0.005 },
            WEIGHBRIDGE: { class: 'Class III', name: 'Electronic Road Pitless Weighbridge', unit: 'kg', max: 60000, e: 10 },
            FUEL_DISPENSER: { class: 'Flowmeter', name: 'Automotive Fuel Dispenser', unit: 'L', max: 60, e: 0.01 },
            FLOWMETER_BULK: { class: 'Flowmeter', name: 'Bulk Liquid Flowmeter', unit: 'L', max: 5000, e: 1 }
        };
        const config = classMap[val] || classMap.NAWI_CLASS_III;
        document.getElementById('addClass').value = config.class;
        document.getElementById('addCategoryName').value = config.name;
        document.getElementById('addUnit').value = config.unit;
        document.getElementById('addMaxCap').value = config.max;
        document.getElementById('addEVal').value = config.e;
    },

    async submitNewInstrument(e) {
        e.preventDefault();
        const payload = {
            instrument_type: document.getElementById('addType').value,
            category_name: document.getElementById('addCategoryName').value,
            make: document.getElementById('addMake').value,
            model_name: document.getElementById('addModelName').value,
            model_approval_no: document.getElementById('addApprovalNo').value,
            serial_number: document.getElementById('addSerial').value,
            accuracy_class: document.getElementById('addClass').value,
            max_capacity: parseFloat(document.getElementById('addMaxCap').value),
            min_capacity: parseFloat(document.getElementById('addMaxCap').value) * 0.01,
            verification_scale_interval_e: parseFloat(document.getElementById('addEVal').value),
            unit: document.getElementById('addUnit').value,
            trade_use: document.getElementById('addTradeUse').value,
            installation_address: document.getElementById('addAddress').value,
            latitude: parseFloat(document.getElementById('addLat')?.value) || 28.6139,
            longitude: parseFloat(document.getElementById('addLng')?.value) || 77.2090
        };

        try {
            const res = await app.api('/api/instruments/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            app.showToast(`Instrument ${res.instrument_uid} registered successfully!`, 'success');
            app.closeModal();
            app.navigate('instruments');
        } catch (err) {
            // Toast handled in api wrapper
        }
    }
};
