#!/usr/bin/env python3
"""
Script to fix parameter order in admin.py
"""

# Read the file
with open('/workspace/showstrack-backend/backend/app/routers/admin.py', 'r') as f:
    content = f.read()

# Replace the problematic patterns
# Pattern 1: current_user with = None needs to be removed and moved before db
content = content.replace(
    'current_user: Annotated[User, Depends(get_current_active_user)],',
    'current_user: Annotated[User, Depends(get_current_active_user)],'
)

# Pattern 2: Fix the remaining = None patterns
content = content.replace(
    'current_user: Annotated[User, Depends(get_current_active_user)] = None',
    'current_user: Annotated[User, Depends(get_current_active_user)]'
)

# Write back
with open('/workspace/showstrack-backend/backend/app/routers/admin.py', 'w') as f:
    f.write(content)

print("Fixed admin.py parameter patterns")