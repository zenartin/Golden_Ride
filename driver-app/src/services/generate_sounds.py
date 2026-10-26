import wave
import struct
import math

def generate_tone(filename, sequence, sample_rate=44100):
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1) # Mono
        wav_file.setsampwidth(2) # 2 bytes per sample (16-bit)
        wav_file.setframerate(sample_rate)
        
        for freq, duration_ms, volume in sequence:
            num_samples = int(sample_rate * (duration_ms / 1000.0))
            for i in range(num_samples):
                # Apply an envelope (attack and decay) to avoid clicks
                envelope = 1.0
                if i < 400:
                    envelope = i / 400.0
                elif i > num_samples - 400:
                    envelope = (num_samples - i) / 400.0
                
                if freq == 0:
                    value = 0
                else:
                    # Sine wave
                    t = float(i) / sample_rate
                    value = int(volume * envelope * 32767.0 * math.sin(2.0 * math.pi * freq * t))
                
                data = struct.pack('<h', value)
                wav_file.writeframesraw(data)

# Option 1: Modern Melodic Chime (Uber style: C5 - E5 - G5)
uber_style = [
    (523.25, 150, 0.7), # C5
    (0, 50, 0),         # Pause
    (659.25, 150, 0.7), # E5
    (0, 50, 0),         # Pause
    (783.99, 400, 0.7), # G5
    (0, 1000, 0)        # Long pause before looping
]
generate_tone('../../assets/sounds/trip_request_melodic.wav', uber_style)

# Option 2: Urgent Double Beep (Classic Taxi style: High C)
urgent_style = [
    (1046.50, 150, 0.8), # C6
    (0, 100, 0),         # Pause
    (1046.50, 150, 0.8), # C6
    (0, 600, 0)          # Pause before looping
]
generate_tone('../../assets/sounds/trip_request_urgent.wav', urgent_style)

# Option 3: Soft Marimba (Lyft style)
lyft_style = [
    (392.00, 100, 0.6), # G4
    (523.25, 200, 0.6), # C5
    (659.25, 400, 0.6), # E5
    (0, 1200, 0)        # Long pause
]
generate_tone('../../assets/sounds/trip_request_soft.wav', lyft_style)

print("Generated 3 alternative ringtones!")
