import asyncio
import sys
import os

# Add the backend directory to the python path
sys.path.append(os.path.join(os.getcwd(), "showstrack-backend/backend"))

from app.models.show import Show

def test_show_instantiation():
    print("--- Testing Show Instantiation with ImportService fields ---")
    try:
        # Simulating the call from ImportService._apply_changes_immediate
        show = Show(
            name="Test Show",
            description="Test Description",
            venue="Por determinar",          # Invalid
            duration_minutes=30,             # Invalid (should be duration_estimated)
            capacity=100,                    # Invalid
            min_age=0,                       # Invalid
            accessibility_info="Por determinar", # Invalid
            show_type="SHOW",                # Invalid (should be show_category)
            is_visible=True
        )
        print("Show instantiated successfully (Unexpected!)")
    except TypeError as e:
        print(f"Caught expected TypeError: {e}")
    except Exception as e:
        print(f"Caught unexpected exception: {type(e).__name__}: {e}")

if __name__ == "__main__":
    test_show_instantiation()
