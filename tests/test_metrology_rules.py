"""
Unit tests for Legal Metrology Rules Engine (2011)
"""
import pytest
from backend.app.services.metrology_rules import MetrologyRulesEngine


def test_nawi_class_ii_mpe():
    """Verify Class II (High Accuracy - Jeweler scale) MPE limits"""
    # e = 0.001g
    # 0 <= m <= 5000e (up to 5g): MPE = +/- 0.5e
    assert MetrologyRulesEngine.get_nawi_mpe_in_e("Class II", 2000) == 0.5
    # 5000e < m <= 20000e (5g to 20g): MPE = +/- 1.0e
    assert MetrologyRulesEngine.get_nawi_mpe_in_e("Class II", 10000) == 1.0
    # > 20000e: MPE = +/- 1.5e
    assert MetrologyRulesEngine.get_nawi_mpe_in_e("Class II", 50000) == 1.5


def test_nawi_class_iii_mpe():
    """Verify Class III (Medium Accuracy - Commercial scales & weighbridges) MPE limits"""
    # 0 <= m <= 500e: MPE = +/- 0.5e
    assert MetrologyRulesEngine.get_nawi_mpe_in_e("Class III", 300) == 0.5
    # 500e < m <= 2000e: MPE = +/- 1.0e
    assert MetrologyRulesEngine.get_nawi_mpe_in_e("Class III", 1200) == 1.0
    # 2000e < m <= 10000e: MPE = +/- 1.5e
    assert MetrologyRulesEngine.get_nawi_mpe_in_e("Class III", 4500) == 1.5


def test_linearity_evaluation():
    """Verify linearity / error of indication test compliance"""
    # Class III scale with e = 5g (0.005 kg)
    # Test point 1: applied = 2.0 kg (400e) -> allowed MPE is 0.5e (2.5g = 0.0025kg)
    # Test point 2: applied = 10.0 kg (2000e) -> allowed MPE is 1.0e (5g = 0.005kg)
    points_passing = [
        {"applied_load": 2.0, "indicated_load": 2.002},  # Error = +2g <= 2.5g (PASS)
        {"applied_load": 10.0, "indicated_load": 10.004}  # Error = +4g <= 5.0g (PASS)
    ]
    passed, details = MetrologyRulesEngine.evaluate_weighing_linearity(
        accuracy_class="Class III",
        e_value=0.005,
        unit="kg",
        test_points=points_passing
    )
    assert passed is True
    assert len(details) == 2
    assert details[0]["passed"] is True

    # Failing point
    points_failing = [
        {"applied_load": 2.0, "indicated_load": 2.008}   # Error = +8g > 2.5g (FAIL)
    ]
    passed_fail, details_fail = MetrologyRulesEngine.evaluate_weighing_linearity(
        accuracy_class="Class III",
        e_value=0.005,
        unit="kg",
        test_points=points_failing
    )
    assert passed_fail is False
    assert details_fail[0]["passed"] is False


def test_repeatability_evaluation():
    """Verify repeatability evaluation across 3 successive weighings"""
    # Class II scale, e = 0.01g, test load = 100g (10000e) -> MPE = 1.0e = 0.01g
    readings_pass = [100.00, 100.01, 100.00]  # max diff = 0.01g <= 0.01g
    passed, rep_info = MetrologyRulesEngine.evaluate_repeatability(
        accuracy_class="Class II",
        e_value=0.01,
        test_load=100.0,
        readings=readings_pass
    )
    assert passed is True
    assert rep_info["max_difference"] == 0.01

    readings_fail = [100.00, 100.03, 100.00]  # max diff = 0.03g > 0.01g
    passed_fail, rep_fail = MetrologyRulesEngine.evaluate_repeatability(
        accuracy_class="Class II",
        e_value=0.01,
        test_load=100.0,
        readings=readings_fail
    )
    assert passed_fail is False


def test_fuel_dispenser_evaluation():
    """Verify +/- 0.5% tolerance on fuel dispensers"""
    # 5L test measure (5000ml) -> allowed error is +/- 25ml
    pass_5l, info_5l = MetrologyRulesEngine.evaluate_fuel_dispenser(5.0, 5.020)  # +20ml error
    assert pass_5l is True
    assert info_5l["error_ml"] == 20.0

    fail_5l, info_fail = MetrologyRulesEngine.evaluate_fuel_dispenser(5.0, 5.035) # +35ml error (exceeds 25ml)
    assert fail_5l is False


def test_statutory_fee_calculation():
    """Verify statutory fee lookup and overdue surcharge"""
    fee_class_ii = MetrologyRulesEngine.calculate_statutory_fee("NAWI_CLASS_II", 500, "g", is_overdue=False)
    assert fee_class_ii["base_fee"] == 300.0
    assert fee_class_ii["late_fee"] == 0.0
    assert fee_class_ii["total_fee"] == 300.0

    fee_overdue = MetrologyRulesEngine.calculate_statutory_fee("WEIGHBRIDGE", 60000, "kg", is_overdue=True)
    assert fee_overdue["base_fee"] == 2500.0
    assert fee_overdue["late_fee"] == 1250.0  # 50% surcharge
    assert fee_overdue["total_fee"] == 3750.0
