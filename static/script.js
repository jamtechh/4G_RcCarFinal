
const socket = io();
let currentThrottle = 0;
let currentTurn = 0;
let currentCamera = 50;
let active = false;

const base = document.getElementById('joystick-base');
const stick = document.getElementById('joystick-stick');
//    const maxTravel = 140;
//    const centerPos = 140;
function getJoystickCenter() {
    return (base.clientWidth - stick.offsetWidth) / 2;
}

function getMaxTravel() {
    return (base.clientWidth - stick.offsetWidth) / 2;
}
const deadzone = 5;

base.addEventListener('mousedown', startDrag);
base.addEventListener('touchstart', startDrag, { passive: false });
document.addEventListener('mousemove', moveDrag);
document.addEventListener('touchmove', moveDrag, { passive: false });
document.addEventListener('mouseup', endDrag);
document.addEventListener('touchend', endDrag);

function startDrag(e) {
    active = true;
    moveDrag(e);
}

function moveDrag(e) {
    if (!active) return;
    e.preventDefault();

    const maxTravel = getMaxTravel();
    const centerPos = getJoystickCenter();
    
    const rect = base.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let deltaX = clientX - (rect.left + rect.width / 2);
    let deltaY = clientY - (rect.top + rect.height / 2);

    deltaX = Math.max(-maxTravel, Math.min(maxTravel, deltaX));
    deltaY = Math.max(-maxTravel, Math.min(maxTravel, deltaY));

    stick.style.left = `${centerPos + deltaX}px`;
    stick.style.top = `${centerPos + deltaY}px`;

    const turnVal = Math.round((deltaX / maxTravel) * 70);
    const throttleVal = Math.round((-deltaY / maxTravel) * 80);

    currentTurn = Math.abs(deltaX) < deadzone ? 0 : turnVal;
    currentThrottle = Math.abs(deltaY) < deadzone ? 0 : throttleVal;

    sendDriveCommand();
}

function endDrag() {
    if (!active) return;
    active = false;
    const centerPos = getJoystickCenter();
    
    stick.style.left = `${centerPos}px`;
    stick.style.top = `${centerPos}px`;

    currentThrottle = 0;
    currentTurn = 0;
    sendDriveCommand();
}

let masterVal = 15;
let KEYBOARD_THROTTLE = masterVal;
let KEYBOARD_TURN = masterVal;

const throttleRange = document.getElementById('throttleRange');
const turnRange = document.getElementById('turnRange');
const throttleValLabel = document.getElementById('throttleVal');
const turnValLabel = document.getElementById('turnVal');

throttleRange.value = masterVal;
turnRange.value = masterVal;

throttleValLabel.textContent = masterVal;
turnValLabel.textContent = masterVal;

const masterRange = document.getElementById('masterRange');
const masterValLabel = document.getElementById('masterVal');

masterRange.value = masterVal;
masterValLabel.textContent = masterVal;

masterRange.addEventListener('input', (e) => {
    const value = parseInt(e.target.value, 10);

    // Set both keyboard limits
    KEYBOARD_THROTTLE = value;
    KEYBOARD_TURN = value;

    // Move both sliders
    throttleRange.value = value;
    turnRange.value = value;

    // Update displayed values
    throttleValLabel.textContent = value;
    turnValLabel.textContent = value;
    masterValLabel.textContent = value;

    // Update current driving immediately if keys are being held
    if (
        keyState.ArrowUp ||
        keyState.ArrowDown ||
        keyState.ArrowLeft ||
        keyState.ArrowRight
    ) {
        updateKeyboardDrive();
    }
});
throttleRange.addEventListener('input', (e) => {
    KEYBOARD_THROTTLE = parseInt(e.target.value, 10);
    throttleValLabel.textContent = KEYBOARD_THROTTLE;

    if (keyState.ArrowUp || keyState.ArrowDown) {
        updateKeyboardDrive();
    }
});

turnRange.addEventListener('input', (e) => {
    KEYBOARD_TURN = parseInt(e.target.value, 10);
    turnValLabel.textContent = KEYBOARD_TURN;

    if (keyState.ArrowLeft || keyState.ArrowRight) {
        updateKeyboardDrive();
    }
});

const keyState = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    a: false,A: false,
    d: false,D: false,
    w: false, W: false,
    s: false, S: false
};

document.addEventListener('keydown', (e) => {
    if (!(e.key in keyState)) return;

    e.preventDefault();

    if (!keyState[e.key]) {
        keyState[e.key] = true;
        if (e.key === 'a' || e.key === 'A') {
            updateCameraAngle(0);
        } else if (e.key === 'd' || e.key === 'D') {
            updateCameraAngle(100);
        } else if (e.key === 'w' || e.key === 'W') {
            adjustMasterSpeed(5);
        } else if (e.key === 's' || e.key === 'S') {
            adjustMasterSpeed(-5);
        }
        else {
            updateKeyboardDrive();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (!(e.key in keyState)) return;

    e.preventDefault();
    keyState[e.key] = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D') {
        resetCamera();
    } else {
        updateKeyboardDrive();
    }
});

function adjustMasterSpeed(delta) {
        const currentVal = parseInt(masterRange.value, 10);
        // Clamp value between min (0) and max (100)
        const newVal = Math.min(100, Math.max(0, currentVal + delta));

        // Update master slider value
        masterRange.value = newVal;

        // Dispatch an 'input' event so all linked sliders/labels update automatically
        masterRange.dispatchEvent(new Event('input'));
    }
function updateCameraAngle(val) {
    currentCamera = val;
    cameraRange.value = val;
    cameraValLabel.textContent = val;
    sendCameraCommand();
}

function updateKeyboardDrive() {
    const maxTravel = getMaxTravel();
    const centerPos = getJoystickCenter();
    
    if (keyState.ArrowUp && !keyState.ArrowDown) {
        currentThrottle = KEYBOARD_THROTTLE;
    } else if (keyState.ArrowDown && !keyState.ArrowUp) {
        currentThrottle = -KEYBOARD_THROTTLE;
    } else {
        currentThrottle = 0;
    }

    if (keyState.ArrowLeft && !keyState.ArrowRight) {
        currentTurn = -KEYBOARD_TURN;
    } else if (keyState.ArrowRight && !keyState.ArrowLeft) {
        currentTurn = KEYBOARD_TURN;
    } else {
        currentTurn = 0;
    }

    const kbX = (currentTurn / 100) * maxTravel;
    const kbY = (-currentThrottle / 100) * maxTravel;

    stick.style.left = `${centerPos + kbX}px`;
    stick.style.top = `${centerPos + kbY}px`;

    sendDriveCommand();
}


const cameraRange = document.getElementById('cameraRange');
const cameraValLabel = document.getElementById('cameraVal');

function resetCamera() {
    currentCamera = 50;
    cameraRange.value = 50;
    cameraValLabel.textContent = 50;
    sendCameraCommand();
}

cameraRange.addEventListener('input', (e) => {
    currentCamera = parseInt(e.target.value, 10);
    cameraValLabel.textContent = currentCamera;
    sendCameraCommand();
});

cameraRange.addEventListener('mousedown', () => {
    window.addEventListener('mouseup', handleRelease, { once: true });
});

cameraRange.addEventListener('touchstart', () => {
    window.addEventListener('touchend', handleRelease, { once: true });
});

function handleRelease() {
    resetCamera();
}

function sendCameraCommand() {
    const inCam = 100-currentCamera;
    const cmd = `C${inCam}`;
    logCommand("Camera", cmd);
    socket.emit('camera_command', cmd);
}

function sendDriveCommand() {
    let cmd = "";

    if (currentThrottle < 0) {
        cmd += "F" + Math.abs(currentThrottle);
    } else if (currentThrottle > 0) {
        cmd += "B" + Math.abs(currentThrottle);
    }

    if (currentTurn > 0) {
        if (cmd.length > 0) cmd += " ";
        cmd += "R" + currentTurn;
    } else if (currentTurn < 0) {
        if (cmd.length > 0) cmd += " ";
        cmd += "L" + Math.abs(currentTurn);
    }

    if (cmd === "") {
        cmd = "F0 L0";
    }
    logCommand("Drive", cmd);
    socket.emit('drive_command', cmd);
}

// Mapping table: Button text -> 2-letter prefix
// Mapping table: Button text -> { prefix, pressed, released }
const buttonConfig = {
    'Look_Left':    { prefix: 'C',      pressed: 100, released: 50,   allowed: 1 },
    'Secondary':    { prefix: 'Se',     pressed: 1, released: 0,    allowed: 0 },
    'Look_Right':   { prefix: 'C',      pressed: 0, released: 50, allowed: 1 },
    'Danger':       { prefix: 'Da',     pressed: 1, released: 0,    allowed: 0 },
    'Warning':      { prefix: 'Wa',     pressed: 1, released: 0,    allowed: 0 }
};

// Target all buttons inside .button-panel
const buttons = document.querySelectorAll('.button-panel .btn');

// Sync button text labels from buttonConfig keys
const configKeys = Object.keys(buttonConfig);
buttons.forEach((btn, index) => {
    if (configKeys[index]) {
        btn.textContent = configKeys[index];
    }
})

buttons.forEach(btn => {
    // Trim button text to match key in map
    const label = btn.textContent.trim();
    const config = buttonConfig[label];

    if (!config) return;
    let isPressed = false;
    
    // Send pressed value when pressed down (Mouse & Touch)
    btn.addEventListener('mousedown', () => {
        isPressed = true;
        sendBtnCmd(config.prefix, config.pressed, config.allowed);
    });
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevents double-firing on mobile touch
        isPressed = true;
        sendBtnCmd(config.prefix, config.pressed, config.allowed);
    });

    // Send released value when released (Mouse & Touch)
    btn.addEventListener('mouseup', () => {
        if (isPressed) {
            isPressed = false;
            sendBtnCmd(config.prefix, config.released, config.allowed);
        }
    });
    btn.addEventListener('mouseleave', () => {
        if (isPressed) {
            isPressed = false;
            sendBtnCmd(config.prefix, config.released, config.allowed);
        }
    });
    btn.addEventListener('touchend', () => {
        if (isPressed) {
            isPressed = false;
            sendBtnCmd(config.prefix, config.released, config.allowed);
        }
    });
});

function sendBtnCmd(prefix, value, allowed) {
    const cmd = `${prefix}${value}`;
    // 1. Log to the browser developer console (F12)
    console.log("Button_Command:", cmd);
    if (allowed == 1){
        logCommand("Drive", cmd);
        socket.emit('button_command', cmd);
    }
}

const logDisplay = document.getElementById('command-log');
function logCommand(source, cmd) {
    if (!logDisplay) return;

    const time = new Date().toLocaleTimeString();
    
    // Create new log entry element
    const entry = document.createElement('div');
    entry.textContent = `[${time}] [${source}] -> ${cmd}`;

    // Insert at the VERY TOP (before the first child)
    logDisplay.insertBefore(entry, logDisplay.firstChild);

    // Keep scroll position at the top to see the newest entry
    logDisplay.scrollTop = 0;
}
