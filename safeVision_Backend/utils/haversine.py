from math import radians, sin, cos, sqrt, atan2

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371 

    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

def get_nearest_contact(accident_lat: float, accident_lon: float, contacts: list) -> object:
    if not contacts:
        return None
    return min(
        contacts,
        key=lambda c: haversine_distance(
            accident_lat, accident_lon,
            c.latitude, c.longitude
        )
    )