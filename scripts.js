
// Démarrer le minuteur d'appel
let callTimer;
let seconds = 84;
function startCallTimer() {
    callTimer = setInterval(() => {
        seconds++;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        document.querySelector('.call-timer').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

const usercodefunction = async(offerObj)=>{
    var code = prompt("Enter Manuel code");
    document.querySelector('#user-name').innerHTML = "Rob-"+code;
    return code;
}

// var usercode = null;
var userName = "IDENTIFIANT: "+Math.floor(Math.random() * 100000)
// usercode = document.querySelector('#usercode').addEventListener('click',usercodefunction)
// if (usercode != null) {
//     userName = "Rob-"+usercode;
// }

const password = "x";
document.querySelector('#user-name').innerHTML = userName;

//if trying it on a phone, use this instead...
const socket = io.connect('https://77.37.37.166:8181/',{
// const socket = io.connect('https://10.199.70.231:8181/',{
// const socket = io.connect('https://localhost:8181/',{
    auth: {
        userName,password
    }
})

const localVideoEl = document.querySelector('#local-video');
const remoteVideoEl = document.querySelector('#remote-video');

let localStream; //a var to hold the local video stream
let remoteStream; //a var to hold the remote video stream
let peerConnection; //the peerConnection that the two clients use to talk
let didIOffer = false;

let peerConfiguration = {
    iceServers:[
        {
            urls:[
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}

//when a client initiates a call
const call = async e=>{
    await fetchUserMedia();

    //peerConnection is all set with our STUN servers sent over
    await createPeerConnection();

    //create offer time!
    try{
        startCallTimer();
        console.log("Creating offer...")
        const offer = await peerConnection.createOffer();
        console.log(offer);
        peerConnection.setLocalDescription(offer);
        didIOffer = true;
        socket.emit('newOffer',offer); //send offer to signalingServer
    }catch(err){
        console.log(err)
    }

}

const hangup = async e=>{
    //close offer time!
    try{
        // peerConnection.close();
        localStream.getTracks().forEach(track=>{
            track.stop();
        })
        remoteStream.getTracks().forEach(track=>{
            track.stop();
        })
        localVideoEl.srcObject = null;
        remoteVideoEl.srcObject = null;
    }catch(err){
        console.log(err)
    }

}

const answerOffer = async(offerObj)=>{
    await fetchUserMedia()
    await createPeerConnection(offerObj);
    const answer = await peerConnection.createAnswer({}); //just to make the docs happy
    await peerConnection.setLocalDescription(answer); //this is CLIENT2, and CLIENT2 uses the answer as the localDesc
    console.log(offerObj)
    console.log(answer)
    // console.log(peerConnection.signalingState) //should be have-local-pranswer because CLIENT2 has set its local desc to it's answer (but it won't be)
    //add the answer to the offerObj so the server knows which offer this is related to
    offerObj.answer = answer 
    //emit the answer to the signaling server, so it can emit to CLIENT1
    //expect a response from the server with the already existing ICE candidates
    const offerIceCandidates = await socket.emitWithAck('newAnswer',offerObj)
    offerIceCandidates.forEach(c=>{
        peerConnection.addIceCandidate(c);
        startCallTimer();
        console.log("======Added Ice Candidate======");
    })
    console.log(offerIceCandidates)
}

const addAnswer = async(offerObj)=>{
    //addAnswer is called in socketListeners when an answerResponse is emitted.
    //at this point, the offer and answer have been exchanged!
    //now CLIENT1 needs to set the remote
    await peerConnection.setRemoteDescription(offerObj.answer)
    // console.log(peerConnection.signalingState)
}

const fetchUserMedia = ()=>{
    return new Promise(async(resolve, reject)=>{
        try{
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localVideoEl.srcObject = stream;
            localStream = stream;    
            resolve();    
        }catch(err){
            console.log(err);
            reject()
        }
    })
}

const createPeerConnection = (offerObj)=>{
    return new Promise(async(resolve, reject)=>{
        //RTCPeerConnection is the thing that creates the connection
        //we can pass a config object, and that config object can contain stun servers
        //which will fetch us ICE candidates
        peerConnection = await new RTCPeerConnection(peerConfiguration)
        remoteStream = new MediaStream()
        remoteVideoEl.srcObject = remoteStream;


        localStream.getTracks().forEach(track=>{
            //add localtracks so that they can be sent once the connection is established
            peerConnection.addTrack(track,localStream);
        })

        peerConnection.addEventListener("signalingstatechange", (event) => {
            console.log(event);
            console.log(peerConnection.signalingState)
        });

        peerConnection.addEventListener('icecandidate',e=>{
            console.log('........Ice candidate found!......')
            console.log(e)
            if(e.candidate){
                socket.emit('sendIceCandidateToSignalingServer',{
                    iceCandidate: e.candidate,
                    iceUserName: userName,
                    didIOffer,
                })    
            }
        })
        
        peerConnection.addEventListener('track',e=>{
            console.log("Got a track from the other peer!! How excting")
            console.log(e)
            e.streams[0].getTracks().forEach(track=>{
                remoteStream.addTrack(track,remoteStream);
                console.log("Here's an exciting moment... fingers cross")
            })
        })

        if(offerObj){
            //this won't be set when called from call();
            //will be set when we call from answerOffer()
            // console.log(peerConnection.signalingState) //should be stable because no setDesc has been run yet
            await peerConnection.setRemoteDescription(offerObj.offer)
            // console.log(peerConnection.signalingState) //should be have-remote-offer, because client2 has setRemoteDesc on the offer
        }
        resolve();
    })
}

const addNewIceCandidate = iceCandidate=>{
    peerConnection.addIceCandidate(iceCandidate)
    console.log("======Added Ice Candidate======")
}


// Toggle camera on/off
function toggleCamera() {
    if (!localStream) return;
    
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
        const isEnabled = videoTracks[0].enabled;
        videoTracks[0].enabled = !isEnabled;
        console.log('Camera', !isEnabled ? 'enabled' : 'disabled');
    }
}

// Toggle microphone on/off
function toggleMicrophone() {
    if (!localStream) return;
    
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length > 0) {
        const isEnabled = audioTracks[0].enabled;
        audioTracks[0].enabled = !isEnabled;
        console.log('Microphone', !isEnabled ? 'enabled' : 'disabled');
    }
}

const micButton = document.getElementById('mic-button');
const videoButton = document.getElementById('video-button');
let micOn = true;
let videoOn = true;
// Contrôle du microphone
micButton.addEventListener('click', function() {
    micOn = !micOn;
    this.classList.toggle('muted', !micOn);
    this.querySelector('i').className = micOn ? 'fas fa-microphone' : 'fas fa-microphone-slash';
    // hideUIAfterDelay();
    toggleMicrophone();
});

// Contrôle de la vidéo
videoButton.addEventListener('click', function() {
    videoOn = !videoOn;
    this.classList.toggle('muted', !videoOn);
    this.querySelector('i').className = videoOn ? 'fas fa-video' : 'fas fa-video-slash';
    document.querySelector('.my-video').style.backgroundColor = videoOn ? '#2a3942' : '#3b4a54';
    // hideUIAfterDelay();
    toggleCamera();
});

document.querySelector('#call').addEventListener('click',call)
document.querySelector('#hangup').addEventListener('click',hangup)