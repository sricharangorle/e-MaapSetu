/**
 * Digital Certificates Management & Viewer Component
 */
const certificateViewerComponent = {
    async render(container, params = {}) {
        try {
            const certificates = await app.api('/api/certificates/');
            const user = app.state.currentUser;

            container.innerHTML = `
                <div class="space-y-6">
                    <!-- Top Bar -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 class="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                <i data-lucide="award" class="w-5 h-5 text-emerald-600"></i>
                                Digital Verification Certificates Repository
                            </h2>
                            <p class="text-xs text-slate-500">Cryptographically signed & QR-verifiable Legal Metrology certificates (Form VII / VIII)</p>
                        </div>
                    </div>

                    <!-- Certificates Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        ${certificates.map(c => `
                            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:shadow-md hover:border-emerald-300 transition relative overflow-hidden">
                                <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-60"></div>
                                
                                <div class="relative z-10 space-y-3">
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-mono font-extrabold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                            ${c.certificate_no}
                                        </span>
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                            ✓ VALID
                                        </span>
                                    </div>

                                    <div>
                                        <h3 class="font-bold text-slate-900 text-sm">${c.instrument.category_name}</h3>
                                        <p class="text-xs text-slate-500">${c.instrument.make_model} • S/N: <span class="font-mono font-semibold">${c.instrument.serial_number}</span></p>
                                    </div>

                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                                        <div class="flex items-center justify-between text-slate-600">
                                            <span>Digital Stamp Seal:</span>
                                            <span class="font-mono font-bold text-slate-900">${c.digital_seal_no}</span>
                                        </div>
                                        <div class="flex items-center justify-between text-slate-600">
                                            <span>Accuracy Class:</span>
                                            <span class="font-bold text-blue-600">${c.accuracy_class}</span>
                                        </div>
                                        <div class="flex items-center justify-between text-slate-600">
                                            <span>Valid Until:</span>
                                            <span class="font-bold text-emerald-700">${c.valid_until}</span>
                                        </div>
                                    </div>

                                    <div class="text-[11px] text-slate-500">
                                        <span class="block truncate font-medium">Trader: <b>${c.trader.org || c.trader.name}</b></span>
                                        <span class="block truncate text-slate-400">Issued by: ${c.issued_by.name} (${c.issued_by.designation})</span>
                                    </div>
                                </div>

                                <div class="pt-4 border-t border-slate-100 flex items-center justify-between mt-4 relative z-10">
                                    <button onclick="certificateViewerComponent.openCertModal('${c.certificate_no}')" class="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                                        <i data-lucide="eye" class="w-4 h-4"></i> Preview Certificate
                                    </button>
                                    <a href="/api/certificates/${c.id}/download-pdf" target="_blank" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition">
                                        <i data-lucide="download" class="w-3.5 h-3.5"></i> PDF
                                    </a>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            lucide.createIcons();

            if (params.certNo) {
                this.openCertModal(params.certNo);
            }
        } catch (e) {
            container.innerHTML = `<div class="p-6 bg-rose-50 text-rose-700 rounded-xl">Error: ${e.message}</div>`;
        }
    },

    async openCertForApp(appId) {
        const certificates = await app.api('/api/certificates/');
        const cert = certificates.find(c => c.instrument.id);
        if (cert) {
            this.openCertModal(cert.certificate_no);
        } else {
            app.showToast("No certificate found for this application", "info");
        }
    },

    async openCertModal(certNo) {
        try {
            const data = await app.api(`/api/certificates/public-verify/${certNo}`);
            if (!data.found) {
                app.showToast(data.message, 'error');
                return;
            }

            app.openModal(`
                <div id="printableCertificateModal" class="p-6 bg-white rounded-2xl relative">
                    <!-- Certificate Header -->
                    <div class="text-center border-b-2 border-blue-900 pb-4 mb-4">
                        <div class="text-xs font-bold uppercase tracking-widest text-slate-500">Government of National Capital Territory of Delhi</div>
                        <div class="text-sm font-extrabold text-blue-900 uppercase">Department of Legal Metrology (Weights & Measures)</div>
                        <h2 class="text-lg font-black text-slate-900 mt-1">CERTIFICATE OF VERIFICATION AND STAMPING</h2>
                        <p class="text-[10px] text-slate-500">(Issued under Section 24 of The Legal Metrology Act, 2009 & Rule 27 of General Rules, 2011)</p>
                    </div>

                    <!-- Meta Top Bar -->
                    <div class="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 text-xs">
                        <div>
                            <div class="text-slate-500 text-[10px]">Certificate Number:</div>
                            <div class="text-sm font-mono font-black text-blue-900">${data.certificate_no}</div>
                            <div class="text-slate-600 mt-1 font-semibold">Digital Stamp Seal: <span class="font-mono font-bold text-slate-900">${data.digital_seal_no}</span></div>
                        </div>
                        <div class="text-right">
                            <span class="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ VALID UNTIL ${data.valid_until}
                            </span>
                            <div class="text-[10px] text-slate-400 mt-1">Stamping Date: ${data.issue_date}</div>
                        </div>
                    </div>

                    <!-- Details 2-Column Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-4">
                        <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                            <h4 class="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider mb-2 border-b pb-1">1. Establishment Details</h4>
                            <div class="space-y-1">
                                <div><b class="text-slate-500">Business:</b> <span class="font-bold text-slate-900">${data.establishment.name}</span></div>
                                <div><b class="text-slate-500">Proprietor:</b> ${data.establishment.proprietor}</div>
                                <div><b class="text-slate-500">GSTIN:</b> <span class="font-mono">${data.establishment.gstin_masked}</span></div>
                                <div><b class="text-slate-500">Premises:</b> ${data.instrument.installation_address}</div>
                            </div>
                        </div>

                        <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                            <h4 class="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider mb-2 border-b pb-1">2. Technical Specifications</h4>
                            <div class="space-y-1">
                                <div><b class="text-slate-500">Category:</b> ${data.instrument.category}</div>
                                <div><b class="text-slate-500">Make/Model:</b> ${data.instrument.make_model}</div>
                                <div><b class="text-slate-500">Serial No:</b> <span class="font-mono font-bold text-slate-900">${data.instrument.serial_number}</span></div>
                                <div><b class="text-slate-500">Accuracy & Range:</b> <span class="font-bold text-blue-700">${data.instrument.accuracy_class}</span> (${data.instrument.capacity})</div>
                            </div>
                        </div>
                    </div>

                    <!-- Verification Authentication Box -->
                    <div class="bg-blue-50/70 border border-blue-200 p-4 rounded-xl text-xs flex items-center justify-between gap-4 mb-5">
                        <div>
                            <div class="font-extrabold text-blue-950">Verified & Stamped By:</div>
                            <div class="font-bold text-slate-800">${data.inspection_details.verified_by_officer}</div>
                            <div class="text-[11px] text-slate-600">${data.inspection_details.officer_designation} • ${data.inspection_details.jurisdiction}</div>
                            <div class="text-[10px] text-slate-400 font-mono mt-1">Hash: ${data.cryptographic_hash.substring(0, 32)}...</div>
                        </div>
                        <div class="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 shadow-inner flex items-center justify-center shrink-0">
                            <i data-lucide="qr-code" class="w-12 h-12 text-blue-900"></i>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center justify-between pt-3 border-t border-slate-200 print:hidden">
                        <button onclick="window.print()" class="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition">
                            <i data-lucide="printer" class="w-4 h-4"></i> Print
                        </button>
                        <div class="space-x-2">
                            <button onclick="app.closeModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition">
                                Close
                            </button>
                            <a href="/verify/${data.certificate_no}" target="_blank" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white shadow transition inline-flex items-center gap-1">
                                <i data-lucide="external-link" class="w-4 h-4"></i> Open Public URL
                            </a>
                        </div>
                    </div>
                </div>
            `);
            lucide.createIcons();
        } catch (e) {
            app.showToast(e.message, 'error');
        }
    }
};
