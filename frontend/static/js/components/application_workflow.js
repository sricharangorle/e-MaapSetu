/**
 * Verification & Re-verification Workflow & Allocation Component
 */
const applicationWorkflowComponent = {
    async render(container, params = {}) {
        try {
            const applications = await app.api('/api/applications/');
            const user = app.state.currentUser;

            container.innerHTML = `
                <div class="space-y-6">
                    <!-- Top Bar -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 class="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                <i data-lucide="file-text" class="w-5 h-5 text-indigo-600"></i>
                                Verification & Stamping Applications
                            </h2>
                            <p class="text-xs text-slate-500">Statutory verification request processing, scheduling, and officer allocation</p>
                        </div>
                        <button onclick="applicationWorkflowComponent.openApplyModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center space-x-1.5">
                            <i data-lucide="file-plus" class="w-4 h-4"></i>
                            <span>New Verification Request</span>
                        </button>
                    </div>

                    <!-- Applications List Table -->
                    <div class="glass-panel rounded-3xl border border-white/80 shadow-lg overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-900/5 border-b border-slate-200/60 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <th class="py-3.5 px-4">Application No</th>
                                        <th class="py-3.5 px-4">Instrument Details</th>
                                        <th class="py-3.5 px-4">Trader / Applicant</th>
                                        <th class="py-3.5 px-4">Type & Fee</th>
                                        <th class="py-3.5 px-4">Assigned Officer / Centre</th>
                                        <th class="py-3.5 px-4">Scheduled Date</th>
                                        <th class="py-3.5 px-4">Status</th>
                                        <th class="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                                    ${this.renderRows(applications, user)}
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

    renderRows(applications, user) {
        if (!applications || applications.length === 0) {
            return `<tr><td colspan="8" class="py-8 text-center text-slate-400">No applications in the verification pipeline.</td></tr>`;
        }

        const statusBadges = {
            SUBMITTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            FEE_PAID: 'bg-blue-50 text-blue-700 border-blue-200',
            SCHEDULED: 'bg-amber-50 text-amber-700 border-amber-200',
            UNDER_INSPECTION: 'bg-purple-50 text-purple-700 border-purple-200',
            COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            REJECTED: 'bg-rose-50 text-rose-700 border-rose-200'
        };

        return applications.map(appItem => `
            <tr class="hover:bg-slate-50/70 transition">
                <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900 font-mono">${appItem.application_no}</div>
                    <div class="text-[10px] text-slate-400">Applied: ${appItem.created_at}</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-semibold text-slate-800">${appItem.instrument.category_name}</div>
                    <div class="text-[11px] text-blue-600 font-mono">${appItem.instrument.uid} (S/N: ${appItem.instrument.serial_number})</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-semibold text-slate-800">${appItem.trader.org || appItem.trader.name}</div>
                    <div class="text-[10px] text-slate-500">${appItem.trader.phone}</div>
                </td>
                <td class="py-3.5 px-4">
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mb-0.5">${appItem.application_type.replace(/_/g, ' ')}</span>
                    <div class="font-bold text-emerald-600">₹${appItem.total_fee}</div>
                    <div class="text-[10px] text-slate-400">Ref: ${appItem.payment_reference || 'PAID'}</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-semibold text-slate-800">${appItem.assigned_officer.name}</div>
                    <div class="text-[10px] text-slate-500">${appItem.assigned_officer.designation}</div>
                </td>
                <td class="py-3.5 px-4">
                    ${appItem.scheduled_date ? `
                        <div class="font-bold text-amber-700">${appItem.scheduled_date}</div>
                        <div class="text-[10px] text-slate-400">Confirmed Slot</div>
                    ` : `
                        <div class="text-[11px] text-slate-400 italic">Preferred: ${appItem.preferred_date || 'Earliest'}</div>
                    `}
                </td>
                <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadges[appItem.status] || 'bg-slate-100 text-slate-600'}">
                        ${appItem.status.replace(/_/g, ' ')}
                    </span>
                </td>
                <td class="py-3.5 px-4 text-right space-x-1">
                    ${user.role === 'admin' && (appItem.status === 'SUBMITTED' || appItem.status === 'FEE_PAID') ? `
                        <button onclick="applicationWorkflowComponent.openAllocateModal(${appItem.id})" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition">
                            Allocate LMO
                        </button>
                    ` : ''}

                    ${(user.role === 'lmo' || user.role === 'gatc') && (appItem.status === 'SCHEDULED' || appItem.status === 'SUBMITTED') ? `
                        <button onclick="fieldInspectionComponent.startInspectionForApp(${appItem.id})" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-[11px] font-bold transition">
                            Conduct Test
                        </button>
                    ` : ''}

                    ${appItem.status === 'COMPLETED' ? `
                        <button onclick="certificateViewerComponent.openCertForApp(${appItem.id})" class="px-2 py-1 text-emerald-600 hover:bg-emerald-50 rounded-lg text-[11px] font-bold transition">
                            <i data-lucide="award" class="w-4 h-4 inline"></i> Cert
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    },

    async openApplyModal(preselectedInstId = null) {
        const instruments = await app.api('/api/instruments/');
        
        app.openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <i data-lucide="file-plus" class="w-5 h-5 text-indigo-600"></i>
                        Application for Verification & Stamping
                    </h3>
                    <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <form id="applyVerificationForm" onsubmit="applicationWorkflowComponent.submitApplication(event)" class="space-y-4 text-xs">
                    <div>
                        <label class="font-bold text-slate-700 block mb-1">Select Instrument *</label>
                        <select id="appInstSelect" onchange="applicationWorkflowComponent.onInstrumentSelect(this.value)" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 bg-slate-50" required>
                            <option value="">-- Choose Registered Instrument --</option>
                            ${instruments.map(i => `
                                <option value="${i.id}" ${preselectedInstId == i.id ? 'selected' : ''} data-type="${i.instrument_type}" data-cap="${i.max_capacity}" data-unit="${i.unit}" data-status="${i.status}">
                                    ${i.category_name} (${i.instrument_uid}) - S/N: ${i.serial_number} [Status: ${i.status}]
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Verification Category *</label>
                            <select id="appType" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 bg-slate-50">
                                <option value="RE_VERIFICATION">Annual / Periodic Re-Verification</option>
                                <option value="INITIAL_VERIFICATION">Initial Stamping (New Instrument)</option>
                            </select>
                        </div>
                        <div>
                            <label class="font-bold text-slate-700 block mb-1">Preferred On-Site Date *</label>
                            <input type="date" id="appPrefDate" min="${new Date().toISOString().split('T')[0]}" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500" required>
                        </div>
                    </div>

                    <!-- Statutory Fee Breakdown Preview -->
                    <div class="bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-2">
                        <div class="flex items-center justify-between font-bold text-blue-900">
                            <span>Statutory Verification Fee (Schedule XII):</span>
                            <span id="feeBase" class="text-sm">₹300.00</span>
                        </div>
                        <div class="flex items-center justify-between text-slate-600 text-[11px]">
                            <span>Late Stamping Surcharge (if overdue):</span>
                            <span id="feeLate">₹0.00</span>
                        </div>
                        <div class="border-t border-blue-200 pt-2 flex items-center justify-between font-extrabold text-blue-950 text-sm">
                            <span>Total Payable Amount:</span>
                            <span id="feeTotal" class="text-emerald-700 text-base">₹300.00</span>
                        </div>
                    </div>

                    <div>
                        <label class="font-bold text-slate-700 block mb-1">Special Site Notes / Dead Weight Equipment Access</label>
                        <textarea id="appNotes" rows="2" placeholder="e.g. Test truck clearance available, site open 9 AM to 6 PM" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"></textarea>
                    </div>

                    <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                        <button type="button" onclick="app.closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition">Cancel</button>
                        <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition">Pay Fee & Submit</button>
                    </div>
                </form>
            </div>
        `);
        lucide.createIcons();

        if (preselectedInstId) {
            this.onInstrumentSelect(preselectedInstId);
        }
    },

    async onInstrumentSelect(instId) {
        if (!instId) return;
        const select = document.getElementById('appInstSelect');
        const opt = select.options[select.selectedIndex];
        const type = opt.getAttribute('data-type');
        const cap = parseFloat(opt.getAttribute('data-cap'));
        const unit = opt.getAttribute('data-unit');
        const status = opt.getAttribute('data-status');

        try {
            const isOverdue = status === 'EXPIRED';
            const calc = await app.api(`/api/instruments/fee-calculator?instrument_type=${type}&max_capacity=${cap}&unit=${unit}&is_overdue=${isOverdue}`);
            document.getElementById('feeBase').textContent = `₹${calc.base_fee.toFixed(2)}`;
            document.getElementById('feeLate').textContent = `₹${calc.late_fee.toFixed(2)}`;
            document.getElementById('feeTotal').textContent = `₹${calc.total_fee.toFixed(2)}`;
        } catch (e) {
            console.error("Fee calc error", e);
        }
    },

    async submitApplication(e) {
        e.preventDefault();
        const instId = document.getElementById('appInstSelect').value;
        const payload = {
            instrument_id: parseInt(instId),
            application_type: document.getElementById('appType').value,
            preferred_date: document.getElementById('appPrefDate').value,
            notes: document.getElementById('appNotes').value
        };

        try {
            const res = await app.api('/api/applications/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            app.showToast(`Application ${res.application_no} submitted! Payment Reference: ${res.payment_ref}`, 'success');
            app.closeModal();
            app.navigate('applications');
        } catch (err) {
            // Error handled
        }
    },

    async openAllocateModal(appId) {
        const officers = await app.api('/api/auth/officers');

        app.openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <i data-lucide="user-check" class="w-5 h-5 text-blue-600"></i>
                        Allocate Verification Task to LMO / GATC
                    </h3>
                    <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <form onsubmit="applicationWorkflowComponent.submitAllocation(event, ${appId})" class="space-y-4 text-xs">
                    <div>
                        <label class="font-bold text-slate-700 block mb-1">Select Field Officer / Testing Laboratory *</label>
                        <select id="allocOfficer" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 bg-slate-50" required>
                            ${officers.map(o => `
                                <option value="${o.id}">
                                    [${o.role}] ${o.name} - ${o.designation} (${o.circle}, ${o.district})
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="font-bold text-slate-700 block mb-1">Scheduled Inspection Date *</label>
                        <input type="date" id="allocDate" value="${new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]}" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500" required>
                    </div>

                    <div>
                        <label class="font-bold text-slate-700 block mb-1">Assignment / Workload Instructions</label>
                        <input type="text" id="allocNotes" placeholder="e.g. Conduct priority inspection as per circle schedule" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500">
                    </div>

                    <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                        <button type="button" onclick="app.closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition">Cancel</button>
                        <button type="submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow transition">Confirm Allocation</button>
                    </div>
                </form>
            </div>
        `);
        lucide.createIcons();
    },

    async submitAllocation(e, appId) {
        e.preventDefault();
        const payload = {
            assigned_officer_id: parseInt(document.getElementById('allocOfficer').value),
            scheduled_date: document.getElementById('allocDate').value,
            notes: document.getElementById('allocNotes').value
        };

        try {
            const res = await app.api(`/api/applications/${appId}/allocate`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            app.showToast(res.message, 'success');
            app.closeModal();
            app.navigate('applications');
        } catch (err) {
            // Toast handled
        }
    }
};
