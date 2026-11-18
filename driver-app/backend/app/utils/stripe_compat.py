"""Stripe's newer Python library returns objects that are not dicts (no .get, no iteration like a dict).
as_dict() turns any Stripe object, list or plain dict into plain Python data so existing code keeps working."""


def as_dict(obj):
    if obj is None or isinstance(obj, (dict, list, str, int, float, bool)):
        return obj
    for name in ("to_dict_recursive", "to_dict"):
        fn = getattr(obj, name, None)
        if callable(fn):
            try:
                return fn()
            except Exception:
                continue
    try:
        return dict(obj)
    except Exception:
        return obj
