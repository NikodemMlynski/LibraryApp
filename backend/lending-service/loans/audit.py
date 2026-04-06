import requests
import os
import logging
from threading import Thread

logger = logging.getLogger(__name__)

ANALYTICS_URL = os.environ.get("ANALYTICS_SERVICE_INTERNAL_URL", "http://analytics-service:8000")

def _send_log_async(action_type, actor_id, visibility, metadata):
    payload = {
        "action_type": action_type,
        "actor_id": str(actor_id),
        "visibility": visibility,
        "metadata": metadata
    }
    try:
        response = requests.post(f"{ANALYTICS_URL}/internal/logs", json=payload, timeout=5)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to send audit log to analytics-service: {e}")

def send_audit_log(action_type: str, actor_id: str, visibility: str, metadata: dict):
    # Sends the audit log async to avoid blocking view responses
    thread = Thread(target=_send_log_async, args=(action_type, actor_id, visibility, metadata))
    thread.start()
