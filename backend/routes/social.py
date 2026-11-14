import json
from fastapi import APIRouter, HTTPException
from backend.database import get_db_connection
from backend.models import SocialAccountUpdate
from backend.utils.security import encrypt_value, decrypt_value

router = APIRouter(prefix="/api/social", tags=["social"])

@router.get("/accounts")
def list_accounts():
    """List all connected and supported social media accounts."""
    conn = get_db_connection()
    accounts = conn.execute("SELECT * FROM social_accounts ORDER BY platform ASC").fetchall()
    conn.close()

    res = []
    for acc in accounts:
        a = dict(acc)
        # Mask sensitive keys
        a["has_access_token"] = bool(a.get("access_token_enc"))
        a["has_client_secret"] = bool(a.get("client_secret_enc"))
        a.pop("access_token_enc", None)
        a.pop("refresh_token_enc", None)
        a.pop("client_secret_enc", None)
        res.append(a)
    return res

@router.post("/accounts/{platform}")
def update_account(platform: str, req: SocialAccountUpdate):
    """Updates API credentials and connection state for a platform."""
    conn = get_db_connection()
    acc = conn.execute("SELECT * FROM social_accounts WHERE platform = ?", (platform,)).fetchone()
    if not acc:
        conn.close()
        raise HTTPException(status_code=404, detail="Platform not supported")

    client_id = req.client_id if req.client_id is not None else acc["client_id"]
    client_secret_enc = encrypt_value(req.client_secret) if req.client_secret is not None else acc["client_secret_enc"]
    access_token_enc = encrypt_value(req.access_token) if req.access_token is not None else acc["access_token_enc"]
    account_name = req.account_name if req.account_name is not None else acc["account_name"]
    account_handle = req.account_handle if req.account_handle is not None else acc["account_handle"]
    
    # Auto connect if token or keys provided
    is_connected = 1 if (req.is_connected or req.access_token or req.client_id) else 0
    if req.is_connected is False:
        is_connected = 0

    conn.execute("""
    UPDATE social_accounts
    SET account_name = ?, account_handle = ?, client_id = ?, client_secret_enc = ?, access_token_enc = ?,
        is_connected = ?, updated_at = CURRENT_TIMESTAMP
    WHERE platform = ?
    """, (account_name, account_handle, client_id, client_secret_enc, access_token_enc, is_connected, platform))
    conn.commit()
    conn.close()

    return {"success": True, "message": f"{platform.capitalize()} credentials saved successfully."}

@router.post("/accounts/{platform}/disconnect")
def disconnect_account(platform: str):
    """Disconnects a platform account and wipes tokens."""
    conn = get_db_connection()
    conn.execute("""
    UPDATE social_accounts
    SET is_connected = 0, access_token_enc = NULL, refresh_token_enc = NULL, client_secret_enc = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE platform = ?
    """, (platform,))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"{platform.capitalize()} disconnected."}

@router.get("/history")
def get_publishing_history():
    """Returns audit log of all publishing actions."""
    conn = get_db_connection()
    logs = conn.execute("""
    SELECT h.*, c.title as clip_title, c.thumbnail_path, c.duration
    FROM publishing_history h
    LEFT JOIN clips c ON h.clip_id = c.id
    ORDER BY h.published_at DESC
    LIMIT 100
    """).fetchall()
    conn.close()
    return [dict(l) for l in logs]
