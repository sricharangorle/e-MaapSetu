"""
Legal Metrology Rules Engine (2011)
Calculates Maximum Permissible Errors (MPE), test compliance, and statutory verification fees.
"""
from typing import Dict, Any, List, Tuple
import datetime
from backend.app.config import STATUTORY_FEE_SCHEDULE, VALIDITY_PERIODS


class MetrologyRulesEngine:

    @staticmethod
    def get_nawi_mpe_in_e(accuracy_class: str, load_in_e: float, is_initial_verification: bool = False) -> float:
        """
        Get Maximum Permissible Error (MPE) in units of 'e' (verification scale interval)
        for Non-Automatic Weighing Instruments according to OIML R76 / Legal Metrology Rules 2011.
        """
        norm_class = accuracy_class.upper().replace(" ", "_")
        mpe_factor = 1.0 if is_initial_verification else 1.0  # In India, field verification uses standard MPE table

        if "CLASS_IV" in norm_class:
            if load_in_e <= 50:
                return 0.5 * mpe_factor
            elif load_in_e <= 200:
                return 1.0 * mpe_factor
            else:
                return 1.5 * mpe_factor

        elif "CLASS_III" in norm_class or "WEIGHBRIDGE" in norm_class:
            if load_in_e <= 500:
                return 0.5 * mpe_factor
            elif load_in_e <= 2000:
                return 1.0 * mpe_factor
            else:
                return 1.5 * mpe_factor

        elif "CLASS_II" in norm_class:
            if load_in_e <= 5000:
                return 0.5 * mpe_factor
            elif load_in_e <= 20000:
                return 1.0 * mpe_factor
            else:
                return 1.5 * mpe_factor

        elif "CLASS_I" in norm_class:
            if load_in_e <= 50000:
                return 0.5 * mpe_factor
            elif load_in_e <= 200000:
                return 1.0 * mpe_factor
            else:
                return 1.5 * mpe_factor

        # Default fallback to Class III limits
        return 1.0

    @classmethod
    def evaluate_weighing_linearity(
        cls,
        accuracy_class: str,
        e_value: float,
        unit: str,
        test_points: List[Dict[str, float]]
    ) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Evaluate Linearity / Error of Indication for weighing instruments.
        Each test_point in test_points: {"applied_load": float, "indicated_load": float}
        Returns (is_passed, detailed_results)
        """
        all_passed = True
        detailed_results = []

        for pt in test_points:
            applied = float(pt.get("applied_load", 0.0))
            indicated = float(pt.get("indicated_load", 0.0))
            error = indicated - applied
            load_in_e = applied / e_value if e_value > 0 else 0.0
            
            allowed_mpe_e = cls.get_nawi_mpe_in_e(accuracy_class, load_in_e)
            allowed_mpe_absolute = allowed_mpe_e * e_value
            
            passed = abs(error) <= (allowed_mpe_absolute + 1e-9)
            if not passed:
                all_passed = False

            detailed_results.append({
                "applied_load": applied,
                "indicated_load": indicated,
                "error": round(error, 4),
                "load_in_e": round(load_in_e, 1),
                "mpe_allowed_in_e": allowed_mpe_e,
                "mpe_allowed_absolute": round(allowed_mpe_absolute, 4),
                "unit": unit,
                "passed": passed
            })

        return all_passed, detailed_results

    @classmethod
    def evaluate_repeatability(
        cls,
        accuracy_class: str,
        e_value: float,
        test_load: float,
        readings: List[float]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Repeatability test (3 successive weighings at approx 50% or 100% capacity)
        Max difference between readings <= MPE for that load.
        """
        if not readings or len(readings) < 2:
            return True, {"max_diff": 0.0, "mpe_allowed": 0.0, "passed": True}

        max_val = max(readings)
        min_val = min(readings)
        diff = max_val - min_val

        load_in_e = test_load / e_value if e_value > 0 else 0.0
        allowed_mpe_e = cls.get_nawi_mpe_in_e(accuracy_class, load_in_e)
        allowed_mpe_abs = allowed_mpe_e * e_value

        passed = diff <= (allowed_mpe_abs + 1e-9)
        return passed, {
            "test_load": test_load,
            "readings": readings,
            "max_difference": round(diff, 4),
            "mpe_allowed": round(allowed_mpe_abs, 4),
            "passed": passed
        }

    @classmethod
    def evaluate_eccentricity(
        cls,
        accuracy_class: str,
        e_value: float,
        corner_load: float,
        corner_readings: List[Dict[str, Any]]
    ) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Eccentricity (Corner loading) test:
        1/3 or 1/4 Max placed on 4 corners and center.
        """
        all_passed = True
        evaluated_corners = []

        load_in_e = corner_load / e_value if e_value > 0 else 0.0
        allowed_mpe_e = cls.get_nawi_mpe_in_e(accuracy_class, load_in_e)
        allowed_mpe_abs = allowed_mpe_e * e_value

        for cr in corner_readings:
            position = cr.get("position", "Center")
            indicated = float(cr.get("indicated_load", corner_load))
            error = indicated - corner_load
            passed = abs(error) <= (allowed_mpe_abs + 1e-9)
            if not passed:
                all_passed = False

            evaluated_corners.append({
                "position": position,
                "applied_load": corner_load,
                "indicated_load": indicated,
                "error": round(error, 4),
                "mpe_allowed": round(allowed_mpe_abs, 4),
                "passed": passed
            })

        return all_passed, evaluated_corners

    @classmethod
    def evaluate_fuel_dispenser(
        cls,
        test_volume_litres: float,
        delivered_volume_litres: float
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Fuel Dispenser volumetric test (Legal Metrology: +/- 0.5% or +/- 25ml per 5L)
        """
        error_litres = delivered_volume_litres - test_volume_litres
        error_ml = error_litres * 1000.0
        error_percent = (error_litres / test_volume_litres) * 100.0 if test_volume_litres > 0 else 0.0

        # Maximum permissible error = +/- 0.5% (or 25 ml on 5000 ml)
        max_allowed_error_ml = test_volume_litres * 5.0  # 5 ml per litre = 0.5%
        passed = abs(error_ml) <= max_allowed_error_ml

        return passed, {
            "test_volume_L": test_volume_litres,
            "delivered_volume_L": delivered_volume_litres,
            "error_ml": round(error_ml, 2),
            "error_percent": round(error_percent, 3),
            "max_allowed_error_ml": round(max_allowed_error_ml, 2),
            "passed": passed
        }

    @classmethod
    def calculate_statutory_fee(
        cls,
        instrument_type: str,
        max_capacity: float,
        unit: str,
        is_overdue: bool = False
    ) -> Dict[str, float]:
        """
        Compute statutory verification fee according to Legal Metrology General Rules Schedule.
        """
        norm_type = instrument_type.upper()
        base_fee = 200.0

        if "CLASS_IV" in norm_type:
            base_fee = STATUTORY_FEE_SCHEDULE["NAWI_CLASS_IV"]
        elif "CLASS_III" in norm_type:
            # Capacity tiering
            cap_in_kg = max_capacity
            if unit.lower() == "g":
                cap_in_kg = max_capacity / 1000.0
            elif unit.lower() == "ton":
                cap_in_kg = max_capacity * 1000.0

            if cap_in_kg <= 50:
                base_fee = STATUTORY_FEE_SCHEDULE["NAWI_CLASS_III"]["up_to_50kg"]
            elif cap_in_kg <= 1000:
                base_fee = STATUTORY_FEE_SCHEDULE["NAWI_CLASS_III"]["up_to_1000kg"]
            else:
                base_fee = STATUTORY_FEE_SCHEDULE["NAWI_CLASS_III"]["above_1000kg"]
        elif "CLASS_II" in norm_type:
            base_fee = STATUTORY_FEE_SCHEDULE["NAWI_CLASS_II"]
        elif "CLASS_I" in norm_type:
            base_fee = STATUTORY_FEE_SCHEDULE["NAWI_CLASS_I"]

        elif "WEIGHBRIDGE" in norm_type:
            base_fee = STATUTORY_FEE_SCHEDULE["WEIGHBRIDGE"]
        elif "FUEL" in norm_type:
            base_fee = STATUTORY_FEE_SCHEDULE["FUEL_DISPENSER"]
        elif "FLOWMETER" in norm_type:
            base_fee = STATUTORY_FEE_SCHEDULE["FLOWMETER_BULK"]
        elif "TANK" in norm_type:
            base_fee = STATUTORY_FEE_SCHEDULE["STORAGE_TANK"]
        elif "LENGTH" in norm_type:
            base_fee = STATUTORY_FEE_SCHEDULE["LENGTH_MEASURE"]
        elif "VOLUME" in norm_type:
            base_fee = STATUTORY_FEE_SCHEDULE["VOLUME_MEASURE"]
        else:
            base_fee = 250.0

        late_fee = (base_fee * 0.5) if is_overdue else 0.0
        total_fee = base_fee + late_fee

        return {
            "base_fee": round(base_fee, 2),
            "late_fee": round(late_fee, 2),
            "total_fee": round(total_fee, 2)
        }

    @classmethod
    def calculate_validity_dates(cls, instrument_type: str, verification_date: datetime.datetime = None) -> Tuple[datetime.datetime, datetime.datetime]:
        """
        Calculate issue date and next statutory due date.
        """
        issue_date = verification_date or datetime.datetime.utcnow()
        months = 12
        for key, val in VALIDITY_PERIODS.items():
            if key in instrument_type.upper():
                months = val
                break
        
        # Approximate month addition (e.g. 12 months = 365 days, 60 months = 1825 days)
        days = int(months * 30.4375)
        valid_until = issue_date + datetime.timedelta(days=days)
        return issue_date, valid_until
