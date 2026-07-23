import json
from pathlib import Path

_BRAND_CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / 'brand.config.json'

with open(_BRAND_CONFIG_PATH) as _f:
    BRAND = json.load(_f)
