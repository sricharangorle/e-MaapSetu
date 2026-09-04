/**
 * Enforcement & Vigilance Management Component
 */
const enforcementComponent = {
    async render(container, params = {}) {
        try {
            const cases = await app.api('/api/enforcement/');
            const user = app.state.currentUser;

            container.innerHTML = `
                <div class="space-y-6">
                    <!-- Top Bar -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 class="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                <i data-lucide="shield-alert" class="w-5 h-5 text-rose-600"></i>
                                Legal Metrology Enforcement & Vigilance Cell
                            </h2>
                            <p class="text-xs text-slate-500">Monitoring consumer malpractices, surprise inspection raids, and statutory seizure memos</p>
                        </div>
                        <button onclick="publicVerifierComponent.openGrievanceModal()" class="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center space-x-1.5">
                            <i data-lucide="plus-circle" class="w-4 h-4"></i>
                            <span>Log Vigilance Complaint</span>
                        </button>
                    </div>

                    <!-- Cases Table -->
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <th class="py-3.5 px-4">Case Reference</th>
                                        <th class="py-3.5 px-4">Premises & Location</th>
                                        <th class="py-3.5 px-4">Violation Category</th>
                                        <th class="py-3.5 px-4">Citizen / Reporter</th>
                                        <th class="py-3.5 px-4">Investigating Officer</th>
                                        <th class="py-3.5 px-4">Status & Penalty</th>
                                        <th class="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                                    ${this.renderRows(cases, user)}
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

    renderRows(cases, user) {
        if (!cases || cases.length === 0) {
            return `<tr><td colspan="7" class="py-8 text-center text-slate-400">No active vigilance cases logged.</td></tr>`;
        }

        const statusBadges = {
            LOGGED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            INVESTIGATION_PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
            RAID_CONDUCTED: 'bg-purple-50 text-purple-700 border-purple-200',
            SEIZED: 'bg-rose-50 text-rose-700 border-rose-200',
            PENALTY_LEVIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            DISMISSED: 'bg-slate-100 text-slate-600 border-slate-200'
        };

        return cases.map(c => `
            <tr class="hover:bg-slate-50/70 transition">
                <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900 font-mono">${c.case_no}</div>
                    <div class="text-[10px] text-slate-400">${c.created_at}</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-800">${c.premises_name}</div>
                    <div class="text-[10px] text-slate-500 truncate max-w-[200px]">${c.location_address}</div>
                </td>
                <td class="py-3.5 px-4">
                    <span class="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200 mb-0.5">
                        ${c.violation_category.replace(/_/g, ' ')}
                    </span>
                    <div class="text-[11px] text-slate-600 truncate max-w-[220px]">${c.description}</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-semibold text-slate-800">${c.citizen_name || 'Anonymous'}</div>
                    <div class="text-[10px] text-slate-400">${c.citizen_phone || 'N/A'}</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-semibold text-slate-800">${c.assigned_officer}</div>
                    <div class="text-[10px] text-slate-400">Enforcement Squad</div>
                </td>
                <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadges[c.status] || 'bg-slate-100 text-slate-600'}">
                        ${c.status.replace(/_/g, ' ')}
                    </span>
                    ${c.penalty_amount_levied > 0 ? `
                        <div class="text-[10px] text-rose-700 font-extrabold mt-0.5">Penalty: ₹${c.penalty_amount_levied}</div>
                    ` : ''}
                </td>
                <td class="py-3.5 px-4 text-right">
                    <button onclick="enforcementComponent.openActionModal(${c.id}, '${c.case_no}')" class="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition">
                        Take Action
                    </button>
                </td>
            </tr>
        `).join('');
    },

    openActionModal(caseId, caseNo) {
        app.openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <i data-lucide="gavel" class="w-5 h-5 text-rose-600"></i>
                        Record Enforcement Action: ${caseNo}
                    </h3>
                    <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <form onsubmit="enforcementComponent.submitAction(event, ${caseId})" class="space-y-4 text-xs">
                    <div>
                        <label class="font-bold text-slate-700 block mb-1">Enforcement Status *</label>
                        <select id="enfStatus" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500 bg-slate-50" required>
                            <option value="PENALTY_LEVIED">Penalty Levied (Compounded under Section 48)</option>
                            <option value="SEIZED">Instrument Seized (Section 15 Seizure Memo)</option>
                            <option value="RAID_CONDUCTED">Raid Conducted & Warning Served</option>
                            <option value="DISMISSED">Dismissed (Found Compliant upon Inspection)</option>
                        </select>
                    </div>

                    <div>
                        <label class="font-bold text-slate-700 block mb-1">Compounding Penalty Amount (₹ INR)</label>
                        <input type="number" id="enfPenalty" value="5000" class="w-full p-2.5 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-rose-500">
                    </div>

                    <div>
                        <label class="font-bold text-slate-700 block mb-1">Action Summary / Inspection Seizure Report *</label>
                        <textarea id="enfSummary" rows="3" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500" required>Surprise raid conducted by LMO Squad. Non-standard weight removed and compounding fine levied under Section 25 of Legal Metrology Act, 2009.</textarea>
                    </div>

                    <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                        <button type="button" onclick="app.closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition">Cancel</button>
                        <button type="submit" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow transition">Save Enforcement Record</button>
                    </div>
                </form>
            </div>
        `);
        lucide.createIcons();
    },

    async submitAction(e, caseId) {
        e.preventDefault();
        const payload = {
            status: document.getElementById('enfStatus').value,
            penalty_amount_levied: parseFloat(document.getElementById('enfPenalty').value) || 0.0,
            action_taken_summary: document.getElementById('enfSummary').value
        };

        try {
            const res = await app.api(`/api/enforcement/${caseId}/action`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            app.showToast(res.message, 'success');
            app.closeModal();
            app.navigate('enforcement');
        } catch (err) {
            // Handled
        }
    }
};
