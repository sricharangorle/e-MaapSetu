/**
 * Public QR Code Verifier & Citizen Grievance Reporting Component
 */
const publicVerifierComponent = {
    async render(container, params = {}) {
        container.innerHTML = `
            <div class="space-y-8 max-w-3xl mx-auto">
                <!-- Banner -->
                <div class="text-center space-y-2">
                    <div class="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full">
                        <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
                        <span>Public Authenticity Verification Portal</span>
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-black text-slate-900">Verify Stamping & Certificate Authenticity</h2>
                    <p class="text-xs text-slate-500 max-w-lg mx-auto">
                        Instantly authenticate weighing and measuring instruments used at retail shops, petrol pumps, jewellery stores, and weighbridges under the Legal Metrology Act, 2009.
                    </p>
                </div>

                <!-- Search / QR Input Card -->
                <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-4">
                    <form onsubmit="publicVerifierComponent.performSearch(event)" class="space-y-3">
                        <label class="font-bold text-slate-800 text-xs block">Enter Certificate Number, Seal ID, or Serial Number:</label>
                        <div class="flex gap-2">
                            <div class="relative flex-1">
                                <i data-lucide="search" class="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5"></i>
                                <input type="text" id="publicSearchQuery" value="${params.certNo || ''}" placeholder="e.g. CERT-DL-2026-00912 or LM-DELHI-SEAL-2026-9812 or MT-2023-99812" class="w-full pl-11 pr-4 py-3 text-xs sm:text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-mono font-semibold" required>
                            </div>
                            <button type="submit" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition flex items-center space-x-1.5 text-xs sm:text-sm">
                                <i data-lucide="check-circle" class="w-4 h-4"></i>
                                <span>Verify</span>
                            </button>
                        </div>
                    </form>

                    <!-- Quick Sample Lookup Chips -->
                    <div class="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-slate-500">
                        <span class="font-semibold text-slate-700">Quick Test Samples:</span>
                        <button onclick="publicVerifierComponent.setQuery('CERT-DL-2026-00912')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-blue-700 font-mono">CERT-DL-2026-00912 (Valid)</button>
                        <button onclick="publicVerifierComponent.setQuery('MIDCO-MPD-2021-081')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-rose-700 font-mono">MIDCO-MPD-2021-081 (Expired)</button>
                        <button onclick="publicVerifierComponent.setQuery('FAKE-STAMP-999')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono">FAKE-STAMP-999 (Invalid)</button>
                    </div>
                </div>

                <!-- Dynamic Verification Result Area -->
                <div id="verificationResultArea"></div>

                <!-- Citizen Grievance Reporting Cell Section -->
                <div class="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-6 rounded-3xl shadow-xl border border-blue-900 space-y-4">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <span class="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-rose-400/30">Citizen Vigilance Cell</span>
                            <h3 class="text-lg font-bold mt-1">Report a Weight & Measure Malpractice</h3>
                            <p class="text-xs text-blue-200">Suspect short delivery, broken lead seal, unapproved scale, or expired stamping?</p>
                        </div>
                        <button onclick="publicVerifierComponent.openGrievanceModal()" class="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center space-x-1.5 shrink-0">
                            <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                            <span>Report Violation</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();

        if (params.certNo) {
            this.executeVerification(params.certNo);
        }
    },

    setQuery(str) {
        document.getElementById('publicSearchQuery').value = str;
        this.executeVerification(str);
    },

    async performSearch(e) {
        e.preventDefault();
        const query = document.getElementById('publicSearchQuery').value.trim();
        if (query) this.executeVerification(query);
    },

    async executeVerification(query) {
        const area = document.getElementById('verificationResultArea');
        area.innerHTML = `
            <div class="flex items-center justify-center py-10">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        `;

        try {
            const data = await app.api(`/api/certificates/public-verify/${encodeURIComponent(query)}`);
            
            if (!data.found) {
                area.innerHTML = `
                    <div class="bg-rose-50 border-2 border-rose-200 p-6 rounded-3xl text-center space-y-2">
                        <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                            <i data-lucide="x-circle" class="w-6 h-6"></i>
                        </div>
                        <h3 class="text-base font-extrabold text-rose-900">Certificate Not Found or Unverified</h3>
                        <p class="text-xs text-rose-700 max-w-md mx-auto">${data.message}</p>
                        <button onclick="publicVerifierComponent.openGrievanceModal('${query}')" class="mt-2 text-xs font-bold text-rose-800 underline">
                            Report this unverified instrument to Enforcement Cell →
                        </button>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            const isValid = data.verification_status === 'AUTHENTIC_VALID';
            const isExpired = data.is_expired;

            area.innerHTML = `
                <div class="bg-white rounded-3xl border-2 ${isValid ? 'border-emerald-500' : 'border-rose-400'} shadow-2xl p-6 space-y-6 relative overflow-hidden">
                    
                    <!-- Result Status Banner -->
                    <div class="flex items-center justify-between border-b pb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 rounded-2xl ${isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} flex items-center justify-center shrink-0">
                                <i data-lucide="${isValid ? 'check-circle' : 'alert-octagon'}" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                                    ${data.verification_status.replace(/_/g, ' ')}
                                </span>
                                <h3 class="text-lg font-black text-slate-900 mt-0.5">
                                    ${isValid ? 'Verified Authentic Legal Metrology Stamping' : 'Non-Compliant / Expired Verification'}
                                </h3>
                            </div>
                        </div>
                        <div class="text-right hidden sm:block">
                            <div class="text-[10px] text-slate-400">Digital Seal ID</div>
                            <div class="font-mono font-black text-blue-900 text-sm">${data.digital_seal_no}</div>
                        </div>
                    </div>

                    <!-- Details 2-Column Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 class="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider mb-2">Establishment & Premises</h4>
                            <div><span class="text-slate-400">Business Name:</span> <b class="text-slate-900">${data.establishment.name}</b></div>
                            <div><span class="text-slate-400">Proprietor:</span> ${data.establishment.proprietor}</div>
                            <div><span class="text-slate-400">Contact:</span> ${data.establishment.phone_masked}</div>
                            <div><span class="text-slate-400">Location:</span> ${data.instrument.installation_address}</div>
                        </div>

                        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 class="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider mb-2">Instrument Technical Specs</h4>
                            <div><span class="text-slate-400">Category:</span> <b class="text-slate-900">${data.instrument.category}</b></div>
                            <div><span class="text-slate-400">Make / Model:</span> ${data.instrument.make_model}</div>
                            <div><span class="text-slate-400">Serial Number:</span> <span class="font-mono font-bold">${data.instrument.serial_number}</span></div>
                            <div><span class="text-slate-400">Accuracy Class:</span> <span class="font-bold text-blue-700">${data.instrument.accuracy_class}</span> (${data.instrument.capacity})</div>
                        </div>
                    </div>

                    <!-- Validity Period Tracker -->
                    <div class="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div>
                            <span class="text-[10px] text-slate-400">Statutory Stamping Validity</span>
                            <div class="font-bold text-sm text-emerald-400">Valid from ${data.issue_date} to ${data.valid_until}</div>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] text-slate-400">Cryptographic SHA-256 Token</span>
                            <div class="font-mono text-[10px] text-blue-300">${data.cryptographic_hash.substring(0, 24)}...</div>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
        } catch (e) {
            area.innerHTML = `<div class="p-4 bg-rose-50 text-rose-700 rounded-xl text-xs">Error: ${e.message}</div>`;
        }
    },

    openGrievanceModal(prefillRef = '') {
        app.openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <i data-lucide="shield-alert" class="w-5 h-5 text-rose-600"></i>
                        Lodge Public Grievance / Report Malpractice
                    </h3>
                    <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <form onsubmit="publicVerifierComponent.submitGrievance(event)" class="space-y-4 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Your Name (Optional / Anonymous)</label>
                            <input type="text" id="grivName" value="Concerned Consumer" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500">
                        </div>
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Your Phone Number (For SMS Status)</label>
                            <input type="text" id="grivPhone" placeholder="+91-XXXXXXXXXX" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Shop / Petrol Pump / Establishment Name *</label>
                            <input type="text" id="grivPremises" placeholder="Name of store or petrol station" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500" required>
                        </div>
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Violation Category *</label>
                            <select id="grivCategory" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500 bg-slate-50" required>
                                <option value="SHORT_DELIVERY">Short Delivery / Inaccurate Measure (Overcharging)</option>
                                <option value="TAMPERED_SEAL">Tampered / Broken Lead Verification Seal</option>
                                <option value="EXPIRED_STAMP">Expired Stamping / Stamped Date Lapsed</option>
                                <option value="UNAPPROVED_MODEL">Unapproved Model / Non-Standard Scale</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <label class="font-bold text-slate-700">Premises Full Address *</label>
                                <button type="button" id="btnGrivGps" onclick="publicVerifierComponent.detectGrievanceLocation()" class="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 text-[11px]">
                                    <i data-lucide="crosshair" class="w-3.5 h-3.5"></i>
                                    <span>📍 Auto-tag My GPS</span>
                                </button>
                            </div>
                            <input type="text" id="grivAddress" placeholder="Street, Market, Area, District" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500" required>
                            <div id="grivLocFeedback" class="text-[10px] text-slate-500 mt-1 hidden"></div>
                            <input type="hidden" id="grivLat" value="28.5204">
                            <input type="hidden" id="grivLng" value="77.2155">
                        </div>
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Suspect Instrument Serial / Certificate No.</label>
                            <input type="text" id="grivSerial" value="${prefillRef}" placeholder="e.g. S/N or Cert No if visible" class="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-rose-500">
                        </div>
                    </div>

                    <div>
                        <label class="font-bold text-slate-700 block mb-1">Detailed Description of Incident *</label>
                        <textarea id="grivDesc" rows="3" placeholder="Describe the incident (e.g. Dispenser display showed 5L but quantity delivered in can was noticeably short, or lead seal was missing)." class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500" required></textarea>
                    </div>

                    <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                        <button type="button" onclick="app.closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition">Cancel</button>
                        <button type="submit" class="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow transition">Submit to Vigilance Cell</button>
                    </div>
                </form>
            </div>
        `);
        lucide.createIcons();
    },

    async detectGrievanceLocation() {
        const btn = document.getElementById('btnGrivGps');
        const feedback = document.getElementById('grivLocFeedback');
        const addrInput = document.getElementById('grivAddress');
        const latInput = document.getElementById('grivLat');
        const lngInput = document.getElementById('grivLng');

        if (btn) {
            btn.innerHTML = `<span class="animate-spin">⌛</span> Locating...`;
        }

        try {
            app.showToast("Requesting live location permission...", "info");
            const loc = await locationService.getRealLocation();

            if (latInput) latInput.value = loc.latitude;
            if (lngInput) lngInput.value = loc.longitude;
            if (addrInput && loc.formattedAddress) addrInput.value = loc.formattedAddress;

            if (feedback) {
                feedback.classList.remove('hidden');
                feedback.innerHTML = `<span class="text-emerald-600 font-bold">✓ Location Tagged:</span> ${loc.latitude.toFixed(5)}° N, ${loc.longitude.toFixed(5)}° E`;
            }
            app.showToast("Current location attached to grievance!", "success");
        } catch (err) {
            console.error("Grievance GPS error", err);
            if (feedback) {
                feedback.classList.remove('hidden');
                feedback.innerHTML = `<span class="text-rose-600 font-semibold">${err.message}</span>`;
            }
            app.showToast(err.message, "warning");
        } finally {
            if (btn) {
                btn.innerHTML = `<i data-lucide="crosshair" class="w-3.5 h-3.5"></i><span>📍 Re-tag Location</span>`;
                lucide.createIcons();
            }
        }
    },

    async submitGrievance(e) {
        e.preventDefault();
        const payload = {
            citizen_name: document.getElementById('grivName').value,
            citizen_phone: document.getElementById('grivPhone').value,
            premises_name: document.getElementById('grivPremises').value,
            violation_category: document.getElementById('grivCategory').value,
            location_address: document.getElementById('grivAddress').value,
            latitude: parseFloat(document.getElementById('grivLat')?.value) || 28.5204,
            longitude: parseFloat(document.getElementById('grivLng')?.value) || 77.2155,
            serial_number: document.getElementById('grivSerial').value,
            description: document.getElementById('grivDesc').value
        };

        try {
            const res = await app.api('/api/enforcement/report-violation', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            app.showToast(`Grievance registered! Case Reference: ${res.case_no}`, 'success');
            app.closeModal();
        } catch (err) {
            // Handled
        }
    }
};
