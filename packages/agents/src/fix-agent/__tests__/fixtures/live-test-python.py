"""
Live Test Python File for Tier 2 Native Fixer Validation

This file contains INTENTIONAL issues that should be fixed by tier 2 native tools:
- F401: Unused imports (ruff --fix, autoflake)
- F632: is comparison with literal (ruff --fix)
- E711: comparison to None (ruff --unsafe-fixes)
- E712: comparison to True/False (ruff --unsafe-fixes)
- Formatting issues (black, ruff format)

DO NOT manually fix these issues - they are test fixtures.
"""

# F401: Unused imports - should be removed by ruff --fix or autoflake
import os
import sys
import json
import re
import datetime
from typing import List, Dict, Optional, Any, Tuple, Union

# Only these imports are actually used
import hashlib


def calculate_hash(data: str) -> str:
    """Calculate MD5 hash of input string."""
    return hashlib.md5(data.encode()).hexdigest()


# F632: is comparison with literal - should use == instead
# ruff --fix can auto-fix this
def check_status(status: str) -> bool:
    """Check if status matches expected values."""
    if status is "active":  # F632: use == for literal comparison
        return True
    if status is "pending":  # F632: use == for literal comparison
        return True
    if status is "completed":  # F632: use == for literal comparison
        return False
    return False


# E711: comparison to None using == instead of is
# ruff --unsafe-fixes can fix this
def validate_input(value: str) -> bool:
    """Validate that input is not None."""
    if value == None:  # E711: comparison to None should use 'is None'
        return False
    if value != None:  # E711: comparison to None should use 'is not None'
        return len(value) > 0
    return True


# E712: comparison to True/False using == instead of direct boolean
# ruff --unsafe-fixes can fix this
def check_flags(enabled: bool, active: bool) -> str:
    """Check boolean flags."""
    if enabled == True:  # E712: comparison to True should be 'if enabled'
        if active == False:  # E712: comparison to False should be 'if not active'
            return "enabled_but_inactive"
        return "fully_active"
    if enabled == False:  # E712: should be 'if not enabled'
        return "disabled"
    return "unknown"


# Formatting issues for black/ruff format
def poorly_formatted_function(arg1:str,arg2:int,arg3:bool=True)->Dict[str,Any]:
    """Function with poor formatting that black/ruff format should fix."""
    result={"arg1":arg1,"arg2":arg2,"arg3":arg3}
    if arg3==True:
        result["status"]="active"
    return result


# Long line that exceeds PEP 8 limit (E501)
def function_with_long_line(very_long_parameter_name_one: str, very_long_parameter_name_two: str, very_long_parameter_name_three: str) -> str:
    """Function with overly long line."""
    return f"{very_long_parameter_name_one}_{very_long_parameter_name_two}_{very_long_parameter_name_three}"


# Missing whitespace around operators
def bad_spacing(x:int,y:int)->int:
    """Function with bad spacing."""
    result=x+y*2
    if result>100:
        result=100
    return result


# Class with formatting issues
class BadlyFormattedClass:
    """Class with various formatting issues."""

    def __init__(self,name:str,value:int)->None:
        self.name=name
        self.value=value

    def get_info(self)->Dict[str,Any]:
        """Get class info."""
        return {"name":self.name,"value":self.value}

    def compare(self,other:"BadlyFormattedClass")->bool:
        """Compare with another instance."""
        if other==None:  # E711
            return False
        if self.value is 0:  # F632
            return other.value is 0  # F632
        return self.value==other.value


# Mixed issues in one function
def complex_function(data: Optional[str], flag: bool) -> Optional[str]:
    """Function combining multiple issues."""
    if data is "test":  # F632
        if flag == True:  # E712
            return "test_active"
    if data == None:  # E711
        return None
    if flag == False:  # E712
        return data.lower()
    return data


# Trailing whitespace and inconsistent indentation (formatting)
def whitespace_issues(items):
    """Function with whitespace issues."""
    for item in items:
        if item is "skip":
            continue
        yield item


if __name__ == "__main__":
    # Test the functions
    print(calculate_hash("test"))
    print(check_status("active"))
    print(validate_input("hello"))
    print(check_flags(True, False))
    print(poorly_formatted_function("test", 42))
