import asyncio
import logging
import sys

try:
    from bless import (
        BlessServer,
        BlessGATTCharacteristic,
        GATTCharacteristicProperties,
        GATTAttributePermissions,
    )
except ImportError:
    print("Warning: 'bless' module not found. Run 'pip install bless' to run this emulator.", file=sys.stderr)
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ESP32-Emulator")

# Matches the UUIDs expected by components/ScaleIngestion.tsx
ESP32_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
ESP32_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"

async def run_emulator():
    # 1. Initialize BLE GATT Server mimicking the ESP32
    server = BlessServer(name="Akiri_Scale")
    server.read_request_func = read_request
    server.write_request_func = write_request

    try:
        await server.add_new_service(ESP32_SERVICE_UUID)
    except Exception as e:
        logger.error(f"Error adding service: {e}")

    char_flags = (
        GATTCharacteristicProperties.read
        | GATTCharacteristicProperties.notify
    )
    permissions = GATTAttributePermissions.readable

    await server.add_new_characteristic(
        ESP32_SERVICE_UUID,
        ESP32_CHAR_UUID,
        char_flags,
        None,
        permissions,
    )

    await server.start()
    logger.info("🟢 ESP32 BLE Scale Emulator Started. Broadcasting as 'Akiri_Scale'...")

    # 2. Dynamic Weight Ramping Loop for Jury Demonstration
    weight = 0.0
    try:
        while True:
            await asyncio.sleep(1.5)
            weight += 2.5
            if weight > 45.5:
                weight = 0.0 # Reset for continuous looping
            
            weight_str = f"{weight:.2f}"
            val_bytes = weight_str.encode('utf-8')
            
            # Update the characteristic to trigger React Native notification listeners
            server.get_characteristic(ESP32_CHAR_UUID).value = val_bytes
            server.update_value(ESP32_SERVICE_UUID, ESP32_CHAR_UUID)
            
            logger.info(f"⚖️ Broadcasted live weight: {weight_str} kg")
    except KeyboardInterrupt:
        logger.info("Stopping emulator...")
        await server.stop()

def read_request(characteristic: BlessGATTCharacteristic, **kwargs) -> bytearray:
    return characteristic.value

def write_request(characteristic: BlessGATTCharacteristic, value: bytearray, **kwargs):
    characteristic.value = value

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    loop = asyncio.get_event_loop()
    loop.run_until_complete(run_emulator())
