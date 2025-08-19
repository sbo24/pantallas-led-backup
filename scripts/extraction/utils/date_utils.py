"""
Utilidades para manejar fechas.
"""
from datetime import datetime, timedelta

def generate_date_range(start_date, end_date):
    """
    Generate a list of date strings in YYYY-MM-DD format between start_date and end_date.
    
    Args:
        start_date (datetime): Start date
        end_date (datetime): End date
        
    Returns:
        list: List of date strings in YYYY-MM-DD format
    """
    date_range = []
    current_date = start_date
    
    while current_date <= end_date:
        date_range.append(current_date.strftime('%Y-%m-%d'))
        current_date += timedelta(days=1)
    
    return date_range

def format_time(time_str):
    """
    Format time string from HHMM to HH:MM.
    
    Args:
        time_str (str): Time string in HHMM format
        
    Returns:
        str: Formatted time string in HH:MM format
    """
    if not time_str or len(time_str) != 4:
        return time_str
    
    return f"{time_str[:2]}:{time_str[2:]}"