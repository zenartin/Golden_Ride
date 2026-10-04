from app.utils.pin import generate_ride_pin, hash_ride_pin, verify_ride_pin

def test():
    ride_id = "1001"
    
    # Simulate create_ride
    pin = generate_ride_pin(ride_id)
    stored_hash = hash_ride_pin(ride_id, pin)
    
    print(f"Ride ID: {ride_id}")
    print(f"Generated PIN: {pin}")
    print(f"Stored Hash: {stored_hash}")
    
    # Simulate verify_ride_pin
    is_valid = verify_ride_pin(ride_id, pin, stored_hash)
    print(f"Is valid with correct PIN: {is_valid}")
    
    # Test invalid pin
    is_invalid = verify_ride_pin(ride_id, "9999", stored_hash)
    print(f"Is valid with wrong PIN: {is_invalid}")
    
    if is_valid and not is_invalid:
        print("SUCCESS! PIN logic works perfectly.")
    else:
        print("FAILURE!")

if __name__ == "__main__":
    test()
