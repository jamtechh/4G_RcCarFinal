import eventlet
eventlet.monkey_patch()

from flask import Flask, Response, render_template
from flask_socketio import SocketIO
#import cv2
import re
import serial
import threading
import queue

# Serial setup
SERIAL_PORT = "/dev/ttyACM0"
BAUD_RATE = 9600
arduino = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
print(f"✅ Connected to {SERIAL_PORT}")

# Queue for safe command transfer to thread
serial_queue = queue.Queue()

# Serial worker thread
def serial_worker():
    while True:
        cmd = serial_queue.get()
        if cmd is None:
            break  # Exit signal
        arduino.write((cmd + "\n").encode())
        print(f"✅ Sent to Arduino: {cmd}")
        serial_queue.task_done()

# Start serial thread
threading.Thread(target=serial_worker, daemon=True).start()

# Send initial stop command on startup
serial_queue.put("F0 L0")
print("⚡ Sent initial safety command: F0 L0")

# Flask app
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
#camera = cv2.VideoCapture(0)

@app.route('/')
def index():
    return render_template('indexDB.html') if app.template_folder else "❌ Error: index.html not hosted"

@socketio.on('connect')
def handle_connect():
    print("Client connected. Initializing the motor state to F0 L0")
    serial_queue.put("F0 L0")

# WebSocket handler
@socketio.on('drive_command')
def handle_drive_command(cmd):
    print(f"🔁 Received: {cmd}")
    if re.match(r'^([FBRLS]\d+)(\s+[FBRLS]\d+)*$', cmd):
        serial_queue.put(cmd)
    else:
        print("❌ Invalid command format")

@socketio.on('camera_command')
def handle_camera_command(cmd):
    print(f"received camera command: {cmd}")
    if re.match(r'^C\d+$', cmd):
        serial_queue.put(cmd)
    else:
        print("Invalid")
        
@socketio.on('button_command')
def handle_camera_command(cmd):
    print(f"received button_command : {cmd}")
    if re.match(r'^C\d+$', cmd):
        serial_queue.put(cmd)
    else:
        print("Invalid")
# Run server
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)


