# Legal Metrology Regulatory Compliance Guide

**Mapping e-MaapSetu to the Legal Metrology Act, 2009 & General Rules, 2011**

---

## 1. Statutory Sections Covered under Legal Metrology Act, 2009

| Section | Act Mandate | e-MaapSetu Implementation |
| :--- | :--- | :--- |
| **Section 15** | Power of Inspection, Search & Seizure by Legal Metrology Officers. | Digital Seizure Memo & Vigilance Raid module in `EnforcementLog`. LMOs log seizure records, capture photo evidence, and issue compounding notices. |
| **Section 24** | Mandatory Verification & Stamping of weights or measures before transaction or protection. | Automated periodic verification workflow, expiry date calculator, and digital Certificate of Verification generation. |
| **Section 25** | Penalty for use of unverified weight or measure. | Automated alert notification engine (30d, 15d, 7d, expired) warning traders of Section 25 penalties with late fee calculation. |
| **Section 27** | Penalty for manufacture, sale or repair without valid license/model approval. | Model Approval Number (`IND/XX/YYYY/ZZZ`) mandatory field in the instrument registry. |
| **Section 48** | Compounding of Offences by authorized officers. | Action logging with compounding fine recording in the Enforcement module. |

---

## 2. Accuracy Classes & Maximum Permissible Errors (MPE) (OIML R76 / General Rules 2011 Schedule VII)

### Non-Automatic Weighing Instruments (NAWI)

#### Class I (Special Accuracy - Precision Micro-balances)
- Verification Scale Interval \(e \le 1\text{ mg}\), Number of verification intervals \(n \ge 50,000\)
- **MPE Limits**:
  * \(0 \le m \le 50,000\,e\): \(\pm 0.5\,e\)
  * \(50,000\,e < m \le 200,000\,e\): \(\pm 1.0\,e\)
  * \(m > 200,000\,e\): \(\pm 1.5\,e\)

#### Class II (High Accuracy - Gold, Bullion & Laboratory Balances)
- Verification Scale Interval \(1\text{ mg} \le e \le 50\text{ mg}\), \(100 \le n \le 100,000\)
- **MPE Limits**:
  * \(0 \le m \le 5,000\,e\): \(\pm 0.5\,e\)
  * \(5,000\,e < m \le 20,000\,e\): \(\pm 1.0\,e\)
  * \(20,000\,e < m \le 100,000\,e\): \(\pm 1.5\,e\)

#### Class III (Medium Accuracy - Commercial Counters, Platform Scales, Road Weighbridges)
- Verification Scale Interval \(e \ge 0.1\text{ g}\), \(100 \le n \le 10,000\)
- **MPE Limits**:
  * \(0 \le m \le 500\,e\): \(\pm 0.5\,e\)
  * \(500\,e < m \le 2,000\,e\): \(\pm 1.0\,e\)
  * \(2,000\,e < m \le 10,000\,e\): \(\pm 1.5\,e\)

#### Class IV (Ordinary Accuracy - Coarse Weighing)
- **MPE Limits**:
  * \(0 \le m \le 50\,e\): \(\pm 0.5\,e\)
  * \(50\,e < m \le 200\,e\): \(\pm 1.0\,e\)
  * \(200\,e < m \le 1,000\,e\): \(\pm 1.5\,e\)

---

## 3. Fuel Dispensing Units (OIML R117 / Rules 2011)

- **Standard Volumetric Measures Tested**: 5 Litres, 10 Litres, 20 Litres
- **Maximum Permissible Error**: \(\pm 0.5\%\) of delivered quantity
  * 5L Test Measure: Allowed Error \(\le \pm 25\text{ ml}\)
  * 10L Test Measure: Allowed Error \(\le \pm 50\text{ ml}\)
  * 20L Test Measure: Allowed Error \(\le \pm 100\text{ ml}\)

---

## 4. Statutory Validity Periods (Rule 27)

| Instrument Category | Statutory Validity Period |
| :--- | :---: |
| Non-Automatic Weighing Instruments (Class I, II, III, IV) | **12 Months (1 Year)** |
| Electronic Road / Pitless Weighbridges | **12 Months (1 Year)** |
| Automotive Fuel Dispensing Units (Petrol / Diesel) | **12 Months (1 Year)** |
| Bulk Flowmeters & Pipeline Meters | **12 Months (1 Year)** |
| Vertical / Horizontal Storage Tanks Calibration | **60 Months (5 Years)** |
| Length Measures (Steel Tapes / Rigid Measures) | **24 Months (2 Years)** |
| Conical / Cylindrical Capacity Measures | **12 Months (1 Year)** |
