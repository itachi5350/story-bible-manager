from slowapi import Limiter
from slowapi.util import get_remote_address

# One shared limiter, imported wherever a route needs limiting. In-memory —
# fine for a single instance. If you ever scale to multiple backend
# instances behind a load balancer, this needs a shared store (e.g. Redis).
limiter = Limiter(key_func=get_remote_address)