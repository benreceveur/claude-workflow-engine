#!/usr/bin/env python3
import json, sys
from datetime import datetime, timedelta
result = {
    "success": True,
    "incident_id": "INC-" + datetime.now().strftime("%Y%m%d-%H%M"),
    "severity": "P2",
    "ttl": (datetime.now() + timedelta(days=30)).isoformat() + "Z"
}
print(json.dumps(result))
