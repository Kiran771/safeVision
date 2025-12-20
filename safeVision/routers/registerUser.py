from fastapi import APIRouter

router = APIRouter()

@router.post("/register")
async def register_user(data: UserDetails):
    """
    Registers a new user and returns the user details.
    """
    user = await crud.register_user_to_psql(data)
    return user