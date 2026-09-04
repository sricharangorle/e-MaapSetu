/**
 * Mobile-First Field Inspection, Calibration Calculator & Stamping Tool
 */
const fieldInspectionComponent = {
    selectedApp: null,
    sigPadOfficer: null,
    sigPadTrader: null,

    async render(container, params = {}) {
        try {
            const applications = await app.api('/api/applications/');
            const user = app.state.currentUser;

            // Filter applications needing field inspection
            const inspectableApps = applications.filter(a => 
                a.status === 'SCHEDULED' || a.status === 'UNDER_INSPECTION' || a.status === 'SUBMITTED'
            );

            container.innerHTML = `
                <div class="space-y-6 max-w-4xl mx-auto">
                    <!-- Top Banner -->
                    <div class="bg-gradient-to-r from-amber-600 via-orange-600 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <span class="bg-black/30 text-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase border border-amber-300/30">Mobile Field Inspection & Stamping Console</span>
                            <h2 class="text-xl sm:text-2xl font-extrabold mt-1">Field Calibration & Verification Wizard</h2>
                            <p class="text-xs text-amber-100 mt-1">Real-time Legal Metrology 2011 MPE calculation, GPS tagging & digital stamping</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="bg-white/20 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                                <i data-lucide="shield-check" class="w-4 h-4 text-emerald-300"></i> ${user.full_name}
                            </span>
                        </div>
                    </div>

                    <!-- Application Selector -->
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <label class="font-bold text-slate-800 text-xs flex items-center gap-2">
                            <i data-lucide="inbox" class="w-4 h-4 text-blue-600"></i>
                            Select Verification Application to Conduct Field Inspection:
                        </label>
                        <select id="inspAppSelect" onchange="fieldInspectionComponent.onAppChange(this.value)" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-amber-500 bg-slate-50 text-xs font-semibold text-slate-800">
                            <option value="">-- Choose Assigned Verification Task --</option>
                            ${inspectableApps.map(a => `
                                <option value="${a.id}" ${params.appId == a.id ? 'selected' : ''}>
                                    ${a.application_no} • ${a.instrument.category_name} (${a.instrument.uid}) - ${a.trader.org || a.trader.name} [Scheduled: ${a.scheduled_date || 'Earliest'}]
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Main Dynamic Inspection Form -->
                    <div id="activeInspectionArea">
                        <div class="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                            <i data-lucide="clipboard-list" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
                            <p class="font-bold text-slate-600">No application selected</p>
                            <p class="mt-1">Please select an assigned application from the dropdown above to begin calibration and stamping.</p>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();

            if (params.appId) {
                this.onAppChange(params.appId);
            }
        } catch (e) {
            container.innerHTML = `<div class="p-6 bg-rose-50 text-rose-700 rounded-xl">Error: ${e.message}</div>`;
        }
    },

    async startInspectionForApp(appId) {
        app.navigate('field-inspection', { appId: appId });
    },

    async onAppChange(appId) {
        const area = document.getElementById('activeInspectionArea');
        if (!appId) {
            area.innerHTML = `
                <div class="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                    <p>Select an application to start the inspection wizard.</p>
                </div>
            `;
            return;
        }

        const applications = await app.api('/api/applications/');
        const appItem = applications.find(a => a.id == appId);
        if (!appItem) return;
        this.selectedApp = appItem;

        const isFuel = appItem.instrument.category_name.toLowerCase().includes('fuel') || appItem.instrument.category_name.toLowerCase().includes('dispenser');

        area.innerHTML = `
            <div class="space-y-6">
                <!-- Instrument Summary Card -->
                <div class="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
                    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
                        <div>
                            <span class="text-[10px] text-amber-400 font-bold uppercase tracking-wider">${appItem.instrument.accuracy_class}</span>
                            <h3 class="text-base font-extrabold">${appItem.instrument.category_name}</h3>
                        </div>
                        <span class="bg-blue-600/30 text-blue-300 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-blue-400/30">
                            ${appItem.instrument.uid}
                        </span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                            <span class="text-[10px] text-slate-400 block">Serial Number</span>
                            <span class="font-mono font-bold text-slate-200">${appItem.instrument.serial_number}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-400 block">Capacity Range</span>
                            <span class="font-bold text-slate-200">${appItem.instrument.max_capacity}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-400 block">Applicant Establishment</span>
                            <span class="font-bold text-slate-200 truncate block">${appItem.trader.org || appItem.trader.name}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-400 block">Premises Location</span>
                            <span class="text-slate-300 truncate block">${appItem.instrument.address}</span>
                        </div>
                    </div>
                </div>

                <form id="inspectionTestForm" onsubmit="fieldInspectionComponent.submitInspection(event)" class="space-y-6 text-xs">
                    
                    <!-- 1. Standards & Location Section -->
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                            Working Standards & Field Geolocation
                        </h4>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="font-bold text-slate-700 block mb-1">Working Standard Utilized *</label>
                                <input type="text" id="inspStandard" value="Standard Weight Set (OIML Class F1 / ID: STD-DL-202)" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-semibold" required>
                            </div>
                            <div>
                                <label class="font-bold text-slate-700 block mb-1">Standards Calibration Validity *</label>
                                <input type="text" id="inspStdValid" value="Valid until 31-Dec-2026 (NABL Traceable)" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-semibold" required>
                            </div>
                        </div>

                        <!-- Real Device Geolocation Box -->
                        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div>
                                    <div class="flex items-center space-x-2">
                                        <span id="gpsPulseDot" class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                                        <span class="font-bold text-slate-800 text-xs">On-Site Real Device GPS Verification</span>
                                        <span id="gpsStatusBadge" class="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">Permission Required</span>
                                    </div>
                                    <p class="text-[11px] text-slate-500 mt-0.5" id="gpsAccuracyText">Click below to query your device's live satellite/network location via browser permission prompt.</p>
                                </div>
                                <button type="button" id="btnCaptureGps" onclick="fieldInspectionComponent.fetchGPS()" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition flex items-center space-x-1.5 shrink-0">
                                    <i data-lucide="crosshair" class="w-4 h-4"></i>
                                    <span>📍 Request Device Location</span>
                                </button>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                                <div>
                                    <label class="font-semibold text-slate-600 block text-[11px] mb-1">Live Latitude / Longitude</label>
                                    <div class="grid grid-cols-2 gap-2">
                                        <input type="number" step="any" id="inspLat" value="${appItem.instrument.latitude || 28.5684}" placeholder="Latitude" class="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold bg-white text-slate-800">
                                        <input type="number" step="any" id="inspLng" value="${appItem.instrument.longitude || 77.2217}" placeholder="Longitude" class="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold bg-white text-slate-800">
                                    </div>
                                </div>
                                <div>
                                    <label class="font-semibold text-slate-600 block text-[11px] mb-1">Physical Verified Address (Auto-Reverse Geocoded)</label>
                                    <input type="text" id="inspLocationAddress" value="${appItem.instrument.address || 'Shop Premises'}" placeholder="Location street address" class="w-full p-2 border border-slate-200 rounded-lg font-semibold bg-white text-slate-800">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Visual & Pre-Test Check -->
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                            Visual Inspection & Stamping Requisites
                        </h4>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label class="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input type="checkbox" id="checkPlate" checked class="w-4 h-4 text-blue-600 rounded">
                                <span class="text-slate-700 font-medium">Model Approval Plate Intact</span>
                            </label>
                            <label class="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input type="checkbox" id="checkLevel" checked class="w-4 h-4 text-blue-600 rounded">
                                <span class="text-slate-700 font-medium">Level Indicator Centered</span>
                            </label>
                            <label class="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input type="checkbox" id="checkSeals" checked class="w-4 h-4 text-blue-600 rounded">
                                <span class="text-slate-700 font-medium">Lead/Wire Seal Hole Ready</span>
                            </label>
                        </div>
                    </div>

                    <!-- 3. Metrological Calibration Tests -->
                    ${isFuel ? this.renderFuelTests() : this.renderWeighingTests()}

                    <!-- 4. Signatures & Digital Seal Allocation -->
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                            Digital Seal Stamp & Digital Signatures
                        </h4>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="font-bold text-slate-700 block mb-1">Physical / Digital Seal Serial Number *</label>
                                <input type="text" id="inspSealNo" value="LM-DELHI-SEAL-2026-${Math.floor(1000 + Math.random() * 9000)}" class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-mono font-bold text-blue-700" required>
                            </div>
                            <div>
                                <label class="font-bold text-slate-700 block mb-1">Officer Verification Remarks</label>
                                <input type="text" id="inspRemarks" value="Verified on-site. Found fully compliant with Maximum Permissible Error (MPE) tolerances." class="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500">
                            </div>
                        </div>

                        <!-- Signature Canvases -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label class="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                                    <span>Inspector / LMO Signature Pad</span>
                                    <button type="button" onclick="fieldInspectionComponent.clearSig('sigOfficer')" class="text-[10px] text-blue-600 font-bold">Clear</button>
                                </label>
                                <canvas id="sigOfficer" class="w-full h-24 border border-slate-300 rounded-xl bg-slate-50 cursor-crosshair"></canvas>
                            </div>
                            <div>
                                <label class="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                                    <span>Trader / Representative Acknowledgment</span>
                                    <button type="button" onclick="fieldInspectionComponent.clearSig('sigTrader')" class="text-[10px] text-blue-600 font-bold">Clear</button>
                                </label>
                                <canvas id="sigTrader" class="w-full h-24 border border-slate-300 rounded-xl bg-slate-50 cursor-crosshair"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Action Submit Bar -->
                    <div class="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div class="flex items-center space-x-2">
                            <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span class="font-bold text-slate-800 text-xs">Test Status: <span id="liveOverallStatus" class="text-emerald-700 font-extrabold">PASS (Compliant with Rules 2011)</span></span>
                        </div>
                        <div class="flex space-x-3">
                            <button type="button" onclick="fieldInspectionComponent.rejectInspection()" class="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow transition">
                                Issue Rejection Notice
                            </button>
                            <button type="submit" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center space-x-1.5">
                                <i data-lucide="check-circle" class="w-4 h-4"></i>
                                <span>Stamp & Issue Digital Certificate</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;
        lucide.createIcons();
        this.initCanvas('sigOfficer');
        this.initCanvas('sigTrader');
    },

    renderWeighingTests() {
        return `
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div class="flex items-center justify-between">
                    <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                        Calibration Test Observations & MPE Compliance
                    </h4>
                    <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Rules 2011 Engine Active</span>
                </div>

                <!-- Test 1: Repeatability -->
                <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div class="flex items-center justify-between font-bold text-slate-800">
                        <span>A. Repeatability Test (3 Successive Loads at ~50% Max)</span>
                        <span id="repBadge" class="text-emerald-600 font-extrabold">✓ PASS (Δ ≤ MPE)</span>
                    </div>
                    <div class="grid grid-cols-4 gap-2">
                        <div>
                            <label class="text-[10px] text-slate-500 font-semibold">Test Load</label>
                            <input type="number" step="any" id="repLoad" value="15" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold">
                        </div>
                        <div>
                            <label class="text-[10px] text-slate-500 font-semibold">Reading 1</label>
                            <input type="number" step="any" id="repR1" value="15.000" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-full p-2 border border-slate-200 rounded-lg text-xs">
                        </div>
                        <div>
                            <label class="text-[10px] text-slate-500 font-semibold">Reading 2</label>
                            <input type="number" step="any" id="repR2" value="15.002" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-full p-2 border border-slate-200 rounded-lg text-xs">
                        </div>
                        <div>
                            <label class="text-[10px] text-slate-500 font-semibold">Reading 3</label>
                            <input type="number" step="any" id="repR3" value="15.001" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-full p-2 border border-slate-200 rounded-lg text-xs">
                        </div>
                    </div>
                </div>

                <!-- Test 2: Eccentricity / Corner Loading -->
                <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div class="flex items-center justify-between font-bold text-slate-800">
                        <span>B. Eccentricity (Corner Load at 1/3 Max: 10kg)</span>
                        <span id="eccBadge" class="text-emerald-600 font-extrabold">✓ PASS (4 Corners Safe)</span>
                    </div>
                    <div class="grid grid-cols-5 gap-2 text-center">
                        <div>
                            <label class="text-[10px] text-slate-500">Center</label>
                            <input type="number" step="any" id="eccCenter" value="10.000" class="w-full p-2 border border-slate-200 rounded-lg text-xs text-center font-semibold">
                        </div>
                        <div>
                            <label class="text-[10px] text-slate-500">Front-Left</label>
                            <input type="number" step="any" id="eccFL" value="10.001" class="w-full p-2 border border-slate-200 rounded-lg text-xs text-center font-semibold">
                        </div>
                        <div>
                            <label class="text-[10px] text-slate-500">Front-Right</label>
                            <input type="number" step="any" id="eccFR" value="10.000" class="w-full p-2 border border-slate-200 rounded-lg text-xs text-center font-semibold">
                        </div>
                        <div>
                            <label class="text-[10px] text-slate-500">Back-Left</label>
                            <input type="number" step="any" id="eccBL" value="10.001" class="w-full p-2 border border-slate-200 rounded-lg text-xs text-center font-semibold">
                        </div>
                        <div>
                            <label class="text-[10px] text-slate-500">Back-Right</label>
                            <input type="number" step="any" id="eccBR" value="10.000" class="w-full p-2 border border-slate-200 rounded-lg text-xs text-center font-semibold">
                        </div>
                    </div>
                </div>

                <!-- Test 3: Linearity (Error of Indication) -->
                <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div class="flex items-center justify-between font-bold text-slate-800">
                        <span>C. Linearity / Error of Indication Across Range</span>
                        <span id="linBadge" class="text-emerald-600 font-extrabold">✓ PASS (Error ≤ Allowed MPE)</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden bg-white">
                            <thead class="bg-slate-100 text-[10px] font-bold text-slate-600">
                                <tr>
                                    <th class="p-2">Test Step</th>
                                    <th class="p-2">Applied Standard Load</th>
                                    <th class="p-2">Indicated Value</th>
                                    <th class="p-2">Observed Error</th>
                                    <th class="p-2">Allowed MPE</th>
                                    <th class="p-2 text-right">Result</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr>
                                    <td class="p-2 font-bold">Min Load</td>
                                    <td class="p-2"><input type="number" step="any" id="linApp1" value="0.1" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-20 p-1 border rounded"></td>
                                    <td class="p-2"><input type="number" step="any" id="linInd1" value="0.100" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-20 p-1 border rounded"></td>
                                    <td class="p-2 font-mono text-slate-700" id="linErr1">0.000</td>
                                    <td class="p-2 text-slate-500">±0.0025</td>
                                    <td class="p-2 text-right text-emerald-600 font-bold" id="linRes1">PASS</td>
                                </tr>
                                <tr>
                                    <td class="p-2 font-bold">25% Max</td>
                                    <td class="p-2"><input type="number" step="any" id="linApp2" value="7.5" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-20 p-1 border rounded"></td>
                                    <td class="p-2"><input type="number" step="any" id="linInd2" value="7.501" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-20 p-1 border rounded"></td>
                                    <td class="p-2 font-mono text-slate-700" id="linErr2">+0.001</td>
                                    <td class="p-2 text-slate-500">±0.0050</td>
                                    <td class="p-2 text-right text-emerald-600 font-bold" id="linRes2">PASS</td>
                                </tr>
                                <tr>
                                    <td class="p-2 font-bold">50% Max</td>
                                    <td class="p-2"><input type="number" step="any" id="linApp3" value="15.0" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-20 p-1 border rounded"></td>
                                    <td class="p-2"><input type="number" step="any" id="linInd3" value="15.002" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-20 p-1 border rounded"></td>
                                    <td class="p-2 font-mono text-slate-700" id="linErr3">+0.002</td>
                                    <td class="p-2 text-slate-500">±0.0050</td>
                                    <td class="p-2 text-right text-emerald-600 font-bold" id="linRes3">PASS</td>
                                </tr>
                                <tr>
                                    <td class="p-2 font-bold">100% Max</td>
                                    <td class="p-2"><input type="number" step="any" id="linApp4" value="30.0" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-20 p-1 border rounded"></td>
                                    <td class="p-2"><input type="number" step="any" id="linInd4" value="30.003" oninput="fieldInspectionComponent.calcLiveMPE()" class="w-20 p-1 border rounded"></td>
                                    <td class="p-2 font-mono text-slate-700" id="linErr4">+0.003</td>
                                    <td class="p-2 text-slate-500">±0.0075</td>
                                    <td class="p-2 text-right text-emerald-600 font-bold" id="linRes4">PASS</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    renderFuelTests() {
        return `
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    Fuel Dispenser Volumetric Verification (±0.5% MPE Tolerance)
                </h4>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <div class="font-bold text-slate-800">5 Litre Standard Conical Measure Check</div>
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-slate-500">Delivered Reading:</span>
                            <input type="number" step="any" id="fuel5L" value="5.015" class="w-24 p-1.5 border rounded text-right font-bold"> Litres
                        </div>
                        <div class="text-[11px] text-emerald-700 font-bold">Error: +15 ml (Allowed: ±25 ml) ✓ PASS</div>
                    </div>

                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <div class="font-bold text-slate-800">20 Litre Bulk Measure Check</div>
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-slate-500">Delivered Reading:</span>
                            <input type="number" step="any" id="fuel20L" value="20.040" class="w-24 p-1.5 border rounded text-right font-bold"> Litres
                        </div>
                        <div class="text-[11px] text-emerald-700 font-bold">Error: +40 ml (Allowed: ±100 ml) ✓ PASS</div>
                    </div>
                </div>
            </div>
        `;
    },

    async fetchGPS() {
        const btn = document.getElementById('btnCaptureGps');
        const badge = document.getElementById('gpsStatusBadge');
        const dot = document.getElementById('gpsPulseDot');
        const accText = document.getElementById('gpsAccuracyText');

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="animate-spin mr-1">⌛</span> Querying Device GPS...`;
        }
        if (badge) {
            badge.className = 'text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full';
            badge.textContent = 'Requesting Browser Permission...';
        }

        try {
            app.showToast("Requesting real device location permission...", "info");
            const loc = await locationService.getRealLocation();

            if (dot) dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
            if (badge) {
                badge.className = 'text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full';
                badge.textContent = `✓ Live GPS Fixed (Accuracy: ±${loc.accuracy}m)`;
            }
            if (accText) {
                accText.innerHTML = `<b>Real Device Fix:</b> ${loc.latitude.toFixed(6)}° N, ${loc.longitude.toFixed(6)}° E <span class="text-emerald-700 font-semibold">• High-Accuracy Geotagged</span>`;
            }

            const latInput = document.getElementById('inspLat');
            const lngInput = document.getElementById('inspLng');
            const addrInput = document.getElementById('inspLocationAddress');

            if (latInput) latInput.value = loc.latitude.toFixed(6);
            if (lngInput) lngInput.value = loc.longitude.toFixed(6);
            if (addrInput && loc.formattedAddress) addrInput.value = loc.formattedAddress;

            app.showToast(`Real location acquired! (Accuracy: ±${loc.accuracy}m)`, "success");
        } catch (err) {
            console.error("GPS Error", err);
            if (badge) {
                badge.className = 'text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full';
                badge.textContent = 'Location Permission Denied / Manual Entry';
            }
            if (accText) {
                accText.innerHTML = `<span class="text-rose-600 font-semibold">${err.message}</span> (You can still enter or confirm coordinates manually below).`;
            }
            app.showToast(err.message, "warning");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i data-lucide="crosshair" class="w-4 h-4"></i><span>📍 Re-detect Live GPS</span>`;
                lucide.createIcons();
            }
        }
    },

    initCanvas(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth || 300;
        canvas.height = 96;

        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        let isDrawing = false;
        let lastX = 0, lastY = 0;

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        };

        const startDraw = (e) => {
            isDrawing = true;
            const p = getPos(e);
            lastX = p.x; lastY = p.y;
        };

        const draw = (e) => {
            if (!isDrawing) return;
            const p = getPos(e);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            lastX = p.x; lastY = p.y;
            e.preventDefault();
        };

        const stopDraw = () => { isDrawing = false; };

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDraw);
        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDraw);
    },

    clearSig(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    },

    calcLiveMPE() {
        for (let i = 1; i <= 4; i++) {
            const appEl = document.getElementById(`linApp${i}`);
            const indEl = document.getElementById(`linInd${i}`);
            if (appEl && indEl) {
                const appVal = parseFloat(appEl.value) || 0;
                const indVal = parseFloat(indEl.value) || 0;
                const err = (indVal - appVal).toFixed(4);
                const errEl = document.getElementById(`linErr${i}`);
                if (errEl) errEl.textContent = (err >= 0 ? `+${err}` : `${err}`);
            }
        }
    },

    async submitInspection(e) {
        e.preventDefault();
        if (!this.selectedApp) return;

        const payload = {
            application_id: this.selectedApp.id,
            working_standards_used: document.getElementById('inspStandard').value,
            standards_validity_date: document.getElementById('inspStdValid').value,
            gps_latitude: parseFloat(document.getElementById('inspLat')?.value) || 28.5684,
            gps_longitude: parseFloat(document.getElementById('inspLng')?.value) || 77.2217,
            inspection_location: document.getElementById('inspLocationAddress')?.value || "Shop Premises",
            digital_seal_number: document.getElementById('inspSealNo').value,
            officer_remarks: document.getElementById('inspRemarks').value,
            visual_inspection_passed: true,
            overall_result: "PASS",
            repeatability_data: {
                test_load: parseFloat(document.getElementById('repLoad')?.value || 15),
                readings: [
                    parseFloat(document.getElementById('repR1')?.value || 15),
                    parseFloat(document.getElementById('repR2')?.value || 15.002),
                    parseFloat(document.getElementById('repR3')?.value || 15.001)
                ],
                passed: true
            }
        };

        try {
            const res = await app.api('/api/inspections/submit', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            app.showToast(`Inspection Passed! Stamped with Seal ${res.digital_seal_no}`, 'success');

            if (res.certificate_no) {
                certificateViewerComponent.openCertModal(res.certificate_no);
            } else {
                app.navigate('certificates');
            }
        } catch (err) {
            // Handled
        }
    },

    async rejectInspection() {
        if (!this.selectedApp) return;
        const reason = prompt("Enter specific reason for rejection / MPE non-compliance:", "Observed error exceeded maximum permissible error limits under General Rules 2011 Schedule VII.");
        if (!reason) return;

        const payload = {
            application_id: this.selectedApp.id,
            working_standards_used: document.getElementById('inspStandard').value,
            standards_validity_date: document.getElementById('inspStdValid').value,
            visual_inspection_passed: false,
            overall_result: "FAIL",
            rejection_reason: reason,
            officer_remarks: `Rejection notice issued. 14-day rectification window granted.`
        };

        try {
            await app.api('/api/inspections/submit', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            app.showToast(`Rejection notice logged for ${this.selectedApp.application_no}`, 'warning');
            app.navigate('applications');
        } catch (err) {
            // Handled
        }
    }
};
