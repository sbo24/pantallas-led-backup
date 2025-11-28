import asyncio
import sys
import os

# Add the backend directory to the python path
sys.path.append(os.path.join(os.getcwd(), "showstrack-backend/backend"))

from app.models.show import Show

def test_show_instantiation():
    print("--- Testing Show Instantiation with Corrected Fields ---")
    try:
        # Simulating the call from ImportService._apply_changes_immediate (FIXED VERSION)
        show = Show(
            name="Test Show Fixed",
            description="Test Description",
            duration_estimated=30,             # Corrected
            show_category="SHOW",              # Corrected
            is_visible=True
        )
        print("SUCCESS: Show instantiated successfully!")
        print(f"Show details: name={show.name}, duration={show.duration_estimated}, category={show.show_category}")
    except TypeError as e:
        print(f"FAILURE: Caught TypeError: {e}")
    except Exception as e:
        print(f"FAILURE: Caught unexpected exception: {type(e).__name__}: {e}")

if __name__ == "__main__":
    test_show_instantiation()
