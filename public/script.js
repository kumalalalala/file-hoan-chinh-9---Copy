const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const muteButton = document.getElementById('muteButton');
const micButton = document.getElementById('micButton');
const switchCameraButton = document.getElementById('switchCameraButton');
const stopCameraButton = document.getElementById('stopCameraButton');
const zoomButton = document.getElementById('zoomButton');
const zoomLevels = document.getElementById('zoomLevels');
const callInterface = document.getElementById('callInterface');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterForm = document.getElementById('showRegisterForm');
const showLoginForm = document.getElementById('showLoginForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');
const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
const toggleLoginPassword = document.getElementById('toggleLoginPassword');
const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
const toggleRegisterPasswordConfirm = document.getElementById('toggleRegisterPasswordConfirm');
const localUserNameDiv = document.getElementById('localUserName');
const remoteUserNameDiv = document.getElementById('remoteUserName');

let localStream;
let peerConnection;
let currentCamera = 'user';
let loggedInUser = null;
let remoteUserName = null;

const socket = io();

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
    switchCameraButton.style.display = 'block';
    zoomButton.style.display = 'block';
}

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

async function startStream() {
    try {
        // Cố gắng lấy video + audio
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentCamera },
            audio: true
        });
    } catch (error) {
        console.warn("Không tìm thấy camera hoặc không được cấp quyền camera. Sử dụng audio-only.");
        // Nếu không được camera, thử lại chỉ audio
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    localVideo.srcObject = localStream;
}

async function startCall() {
    peerConnection = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { offer: offer, username: loggedInUser });
}

socket.on('offer', async (data) => {
    const { offer, username } = data;
    remoteUserName = username;
    remoteUserNameDiv.textContent = remoteUserName ? remoteUserName : '';

    peerConnection = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { answer: answer, username: loggedInUser });
});

socket.on('answer', (data) => {
    const { answer, username } = data;
    remoteUserName = username;
    remoteUserNameDiv.textContent = remoteUserName ? remoteUserName : '';
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

startButton.onclick = async () => {
    if (loginForm.style.display !== 'none' || registerForm.style.display !== 'none') {
        alert("Bạn cần đăng nhập trước khi bắt đầu cuộc gọi.");
        return;
    }
    await startStream();
    startCall();
};

muteButton.onclick = () => {
    const remoteStream = remoteVideo.srcObject;
    if (remoteStream) {
        remoteVideo.muted = !remoteVideo.muted;
        muteButton.textContent = remoteVideo.muted ? 'Bật loa' : 'Tắt loa';
    }
};

micButton.onclick = () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        micButton.textContent = audioTrack.enabled ? 'Tắt mic' : 'Bật mic';
    }
};

switchCameraButton.onclick = async () => {
    currentCamera = currentCamera === 'user' ? 'environment' : 'user';
    await startStream();
    if (peerConnection && localStream) {
        const videoSender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
            await videoSender.replaceTrack(localStream.getVideoTracks()[0]);
        }
    }
};

stopCameraButton.onclick = () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        stopCameraButton.textContent = videoTrack.enabled ? 'Tắt camera' : 'Bật camera';
    }
};

zoomButton.onclick = () => {
    zoomLevels.style.display = zoomLevels.style.display === 'none' ? 'flex' : 'none';
};

document.querySelectorAll('.zoom-level').forEach(button => {
    button.onclick = (event) => {
        const zoomValue = event.target.getAttribute('data-zoom');
        const videoTrack = localStream ? localStream.getVideoTracks()[0] : null;
        if (videoTrack) {
            const constraints = {
                advanced: [{ zoom: zoomValue }]
            };
            videoTrack.applyConstraints(constraints)
                .then(() => console.log(`Zoom applied: ${zoomValue}x`))
                .catch(error => console.error("Error applying zoom constraints:", error));
        }
    };
});

toggleLoginPassword.onclick = () => {
    loginPassword.type = (loginPassword.type === 'password') ? 'text' : 'password';
};

toggleRegisterPassword.onclick = () => {
    registerPassword.type = (registerPassword.type === 'password') ? 'text' : 'password';
};

toggleRegisterPasswordConfirm.onclick = () => {
    registerPasswordConfirm.type = (registerPasswordConfirm.type === 'password') ? 'text' : 'password';
};

showRegisterForm.onclick = () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    loginMessage.textContent = '';
    registerMessage.textContent = '';
};

showLoginForm.onclick = () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    loginMessage.textContent = '';
    registerMessage.textContent = '';
};

loginBtn.onclick = async () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    if (!username || !password) {
        loginMessage.textContent = 'Vui lòng điền đầy đủ tài khoản và mật khẩu.';
        return;
    }
    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const text = await res.text();
    if (res.status === 200) {
        loginMessage.style.color = 'green';
        loginMessage.textContent = 'Đăng nhập thành công!';
        loggedInUser = username;
        localUserNameDiv.textContent = loggedInUser;
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        callInterface.style.display = 'block';
        startButton.disabled = false;
    } else {
        loginMessage.style.color = 'red';
        loginMessage.textContent = text;
    }
};

registerBtn.onclick = async () => {
    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();
    const passwordConfirm = registerPasswordConfirm.value.trim();

    if (!username || !password || !passwordConfirm) {
        registerMessage.textContent = 'Vui lòng điền đầy đủ thông tin.';
        return;
    }

    if (password !== passwordConfirm) {
        registerMessage.textContent = 'Mật khẩu xác nhận không trùng khớp.';
        return;
    }

    const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const txt = await res.text();
    if (res.status === 200) {
        registerMessage.style.color = 'green';
        registerMessage.textContent = 'Đăng ký thành công! Hãy đăng nhập.';
        setTimeout(() => {
            showLoginForm.click();
        }, 2000);
    } else {
        registerMessage.style.color = 'red';
        registerMessage.textContent = txt;
    }
};
