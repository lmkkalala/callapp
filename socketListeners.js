
//on connection get all available offers and call createOfferEls
socket.on('availableOffers',offers=>{
    console.log(offers)
    createOfferEls(offers)
})

//someone just made a new offer and we're already here - call createOfferEls
socket.on('newOfferAwaiting',offers=>{
    createOfferEls(offers)
})

socket.on('answerResponse',offerObj=>{
    console.log(offerObj)
    addAnswer(offerObj)
})

socket.on('receivedIceCandidateFromServer',iceCandidate=>{
    addNewIceCandidate(iceCandidate)
    console.log(iceCandidate)
})

function createOfferEls(offers){
    //make green answer button for this new offer
    const answerEl = document.querySelector('#answer');
    offers.forEach(o=>{
        console.log(o);
        const newOfferEl = document.createElement('div');
        // newOfferEl.innerHTML = `<button class="btn btn-secondary w-100 mt-3 mb-3"> <i class="fas fa-phone"></i> ${o.offererUserName}</button>`
        newOfferEl.innerHTML = `<button style="background-color: none;
                                border: none;
                                color: black;
                                padding: 5px 10px;
                                text-align: center;
                                text-decoration: none;
                                display: inline-block;
                                font-size: 16px;
                                margin-top: 5px;
                                "> <i class="fas fa-phone"></i> ${o.offererUserName}</button>`
        newOfferEl.addEventListener('click',()=>answerOffer(o))
        answerEl.appendChild(newOfferEl);
    })
}