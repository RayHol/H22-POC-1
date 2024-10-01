// Global variable definitions
let modelIndex = 0;
let videoEntity = null;
let frameEntity = null;
let lookImages = [];
let mediaEntity = null;
let fixedAngleDegrees = 0;
let currentZoom = 25; // Initial distance from the user
let currentY = 0; // Initial Y position
let initialMediaState = {
    position: null,
    rotation: null
};
let hasPopupShown = false; // congrats popup
let hasPopupClosed = false;
let currentLocationIndex = 0;
let locations = []; // This will be filled with the keys from mediaConfig.json
let mediaArray = []; // Current media array for the location

const minZoom = 10; // Minimum distance from the user
const maxZoom = 100; // Maximum distance from the user
const minY = -15; // Set minimum Y value
const maxY = 20; // Set maximum Y value
const zoomSpeed = 0.01; // Adjust the zoom speed as needed
const dragSpeedX = 0.07; // Adjust the drag speed for the x-axis
const dragSpeedY = 0.005; // Adjust the drag speed for the y-axis

// Pinch-to-zoom variables
let initialPinchDistance = null;
let isPinching = false; // Flag to indicate if a pinch-to-zoom gesture is in progress

// Drag functionality variables
let isDragging = false;
let initialTouchX = null;
let initialTouchY = null;
let initialFixedAngle = 0;
let dragAxis = null; // 'x' for rotation, 'y' for vertical movement

let currentAudio = null; // Keep track of the current playing audio
let isChangingMedia = false; // Flag to prevent repeated calls
let isFirstLoad = true; // Global flag to check if it's the first load

let currentFixedAngleDisplay;
let currentYPositionDisplay;
let currentZDepthDisplay;


function saveAngle(location, angle) {
    const savedAngles = JSON.parse(localStorage.getItem('savedAngles')) || {};
    savedAngles[location] = angle;
    localStorage.setItem('savedAngles', JSON.stringify(savedAngles));
}

function refreshMediaPosition() {
    if (mediaEntity) {
        const mediaItem = mediaArray[modelIndex];
        const fixedAngleDegrees = mediaItem.fixedAngleDegrees || 0;

        const radians = (fixedAngleDegrees * Math.PI) / 180;
        currentZoom = 25;  // Reset zoom
        currentY = 0;      // Reset Y position

        const position = {
            x: -currentZoom * Math.sin(radians),
            y: currentY,
            z: -currentZoom * Math.cos(radians)
        };
        const rotation = { x: 0, y: fixedAngleDegrees, z: 0 };

        initialMediaState.position = { ...position };
        initialMediaState.rotation = { ...rotation };

        mediaEntity.setAttribute("position", position);
        mediaEntity.setAttribute("rotation", rotation);

        if (frameEntity) {
            frameEntity.setAttribute("position", position);
            frameEntity.setAttribute("rotation", rotation);
        }

        removeAllMedia();
        loadLocationMedia();

        updateCurrentValues();
    }
}


function updateLookImages() {
    lookImages.forEach((lookImage, index) => {
        const angle = (index + 1) * 90;
        const lookRadians = ((fixedAngleDegrees + angle) * Math.PI) / 180;
        const lookX = -currentZoom * Math.sin(lookRadians);
        const lookZ = -currentZoom * Math.cos(lookRadians);

        lookImage.setAttribute("position", { x: lookX, y: 0, z: lookZ });
        lookImage.setAttribute("rotation", { x: 0, y: angle + fixedAngleDegrees, z: 0 });
    });
}


function toggleMuteButton(isMuted) {
    const buttonText = isMuted ? "Unmute" : "Mute";
    const buttonIcon = isMuted ? "./assets/images/UI/unmute-icon.svg" : "./assets/images/UI/mute-icon.svg";
    const muteButton = document.getElementById("mute");

    muteButton.innerHTML = `<img src="${buttonIcon}" alt="${buttonText} button" class="button-icon"> ${buttonText}`;
}

// Congrats page pop up
function showCongratulationsPopup() {
    if (!hasPopupShown && !hasPopupClosed) {
        const popup = document.getElementById('congratulations-overlay');
        popup.style.display = 'flex';
        hasPopupShown = true;
    }
}

function closeCongratsPopup() {
    const popup = document.getElementById('congratulations-overlay');
    popup.style.display = 'none';
    hasPopupClosed = true;
}

function loadNextLocation() {
    modelIndex = 0;
    currentLocationIndex = (currentLocationIndex + 1) % locations.length;
    loadLocationMedia();
}

function loadPreviousLocation() {
    modelIndex = 0;
    currentLocationIndex = (currentLocationIndex - 1 + locations.length) % locations.length;
    loadLocationMedia();
}

function loadLocationMedia() {
    fetch("./Scripts/mediaConfig.json")
        .then((response) => response.json())
        .then((data) => {
            hasPopupShown = false;
            const locationData = data[locations[currentLocationIndex]];
            const commonValues = locationData.common;
            mediaArray = locationData.media;
            modelIndex = 0;
            fixedAngleDegrees = commonValues.fixedAngleDegrees || 0;
            const radians = (fixedAngleDegrees * Math.PI) / 180;
            initialMediaState.position = { x: -currentZoom * Math.sin(radians), y: commonValues.initialY, z: commonValues.initialZ };
            initialMediaState.rotation = { x: 0, y: fixedAngleDegrees, z: 0 };

            initializeMedia(mediaArray, commonValues);
        })
        .catch((error) => console.error("Error loading media config:", error));
}

function navigateToLocation(locationId) {
    currentLocationIndex = locations.indexOf(locationId);
    if (currentLocationIndex === -1) {
        console.error("Invalid location specified");
        return;
    }
    loadLocationMedia();
}

function initializeAR() {
    const urlParams = new URLSearchParams(window.location.search);
    const locationId = urlParams.get("location");

    fetch("./Scripts/mediaConfig.json")
        .then((response) => response.json())
        .then((data) => {
            // Load media from multiple locations (location1, location2, location3, location4)
            const locationsToLoad = ['location1', 'location2', 'location3', 'location4'];
            
            locationsToLoad.forEach(locationKey => {
                if (data[locationKey]) {
                    const locationData = data[locationKey];
                    const commonValues = locationData.common;
                    const mediaArray = locationData.media;
                    
                    // Initialize media for each location
                    initializeMedia(mediaArray, commonValues);
                } else {
                    console.error(`Invalid location: ${locationKey}`);
                }
            });
        })
        .catch((error) => console.error("Error loading media config:", error));
}



function updateFixedAngleDegrees(newAngle) {
    fixedAngleDegrees = newAngle;
    saveAngle(locations[currentLocationIndex], newAngle);

    const radians = (fixedAngleDegrees * Math.PI) / 180;
    const x = -currentZoom * Math.sin(radians);
    const z = -currentZoom * Math.cos(radians);

    if (mediaEntity) {
        mediaEntity.setAttribute('position', { x, y: currentY, z });
        mediaEntity.setAttribute('rotation', `0 ${fixedAngleDegrees} 0`);
    }

    if (frameEntity) {
        frameEntity.setAttribute('position', { x, y: currentY, z });
        frameEntity.setAttribute('rotation', `0 ${fixedAngleDegrees} 0`);
    }

    updateLookImages();
    updateCurrentValues();
}

document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const isSetupMode = urlParams.get("setup") === "true";
    const fixedAngleInput = document.getElementById('fixed-angle');
    const updateAngleButton = document.getElementById('update-angle');
    const controlsDiv = document.getElementById('controls');

    currentFixedAngleDisplay = document.getElementById('current-fixed-angle');
    currentYPositionDisplay = document.getElementById('current-y-position');
    currentZDepthDisplay = document.getElementById('current-z-depth');

    if (isSetupMode) {
        controlsDiv.style.display = 'block';
    }

    updateAngleButton.addEventListener('click', () => {
        const newAngle = parseInt(fixedAngleInput.value, 10);
        if (!isNaN(newAngle)) {
            updateFixedAngleDegrees(newAngle);
        }
    });

    const arScene = document.getElementById('ar-scene');
    initializeAR();

    const closePopupButton = document.getElementById('close-congrats-overlay');
    if (closePopupButton) {
        closePopupButton.addEventListener('click', closeCongratsPopup);
    }

    const viewMapButton = document.getElementById("view-map");
    const helpButton = document.getElementById("help");
    const refreshButton = document.getElementById("refresh");

    if (viewMapButton) {
        viewMapButton.addEventListener("click", () => {
        });
    }

    if (helpButton) {
        helpButton.addEventListener("click", () => {
            const helpOverlay = document.getElementById("help-overlay");
            if (helpOverlay) {
                helpOverlay.style.display = "flex";
            }
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            refreshMediaPosition();
        });
    }

    const mapOverlay = document.getElementById('map-overlay');
    const closeMapOverlayButton = document.getElementById('close-map-overlay');

    if (viewMapButton && closeMapOverlayButton) {
        viewMapButton.addEventListener('click', () => {
            if (mapOverlay) {
                mapOverlay.style.display = 'flex';
            }
        });

        closeMapOverlayButton.addEventListener('click', () => {
            if (mapOverlay) {
                mapOverlay.style.display = 'none';
            }
        });
    }

    const closeHelpOverlayButton = document.getElementById("close-help-overlay");

    if (helpButton && closeHelpOverlayButton) {
        helpButton.addEventListener("click", () => {
            const helpOverlay = document.getElementById("help-overlay");
            if (helpOverlay) {
                helpOverlay.style.display = "flex";
            }
        });

        closeHelpOverlayButton.addEventListener("click", () => {
            const helpOverlay = document.getElementById("help-overlay");
            if (helpOverlay) {
                helpOverlay.style.display = "none";
            }
        });
    }

    const continueButton = document.getElementById('continue-button');
    const backButton = document.getElementById('back-button');

    if (continueButton) {
        continueButton.addEventListener('click', () => {
            loadNextLocation();
            document.getElementById('congratulations-overlay').style.display = 'none';
        });
    }

    if (backButton) {
        backButton.addEventListener('click', () => {
            loadPreviousLocation();
            document.getElementById('congratulations-overlay').style.display = 'none';
        });
    }

    document
        .querySelectorAll(".button-text, h1-1, h1-2, h2, p, button")
        .forEach((el) => el.classList.add("unselectable"));
});

function removeAllMedia() {
    let scene = document.querySelector("a-scene");

    let mediaElements = scene.querySelectorAll('a-image, a-video, a-audio');
    mediaElements.forEach(element => {
        if (element.tagName === 'A-VIDEO') {
            element.pause();
            element.currentTime = 0;
        }
        element.parentNode.removeChild(element);
    });

    if (currentAudio) {
        currentAudio.pause();
        document.body.removeChild(currentAudio);
        currentAudio = null;
    }

    mediaEntity = null;
    videoEntity = null;

}

function checkOrientation() {
    const orientationOverlay = document.getElementById('orientation-overlay');
    if (window.innerHeight < window.innerWidth) {
        orientationOverlay.style.display = 'flex';
    } else {
        orientationOverlay.style.display = 'none';
    }
}

window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
window.addEventListener('DOMContentLoaded', checkOrientation);

function initializeMedia(mediaArray, commonValues) {
    const button = document.querySelector('button[data-action="change"]');

    // Clear previous button text
    const existingButtonText = document.querySelector('.button-text');
    if (existingButtonText) {
        existingButtonText.remove();
    }

    const buttonText = document.createElement("div");
    buttonText.className = "button-text";
    button.insertAdjacentElement("beforebegin", buttonText);

    // Remove old event listeners
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);

    // Filter media to include only images
    const imageMediaArray = mediaArray.filter(mediaItem => mediaItem.type === "image");

    // Display only the filtered image media (up to 4 items)
    const maxMediaToDisplay = Math.min(imageMediaArray.length, 4);
    imageMediaArray.slice(0, maxMediaToDisplay).forEach((mediaItem, index) => {
        displayMedia(imageMediaArray, index, commonValues); // Display each image item
    });

    newButton.addEventListener("click", () => {
        changeMedia(imageMediaArray, commonValues); // Handle media change logic for images
    });
}



function displayMedia(mediaArray, index, commonValues, currentPosition, currentRotation) {
    let scene = document.querySelector("a-scene");
    let mediaItem = mediaArray[index];

    // Calculate the position using fixedAngleDegrees, initialY, and initialZ (for zoom)
    const fixedAngleDegrees = commonValues.fixedAngleDegrees || 0;
    const radians = (fixedAngleDegrees * Math.PI) / 180;

    // Ensure initialZ (zoom) is applied to the position calculation
    const zoom = commonValues.initialZ || 25; // Default to 25 if initialZ is not provided
    const positionOffsetX = index * 5; // Offset for each media to avoid overlap

    // Calculate position using zoom (initialZ) and fixedAngleDegrees
    const position = currentPosition || {
        x: -zoom * Math.sin(radians) + positionOffsetX, // X offset and zoom applied
        y: commonValues.initialY || 0,                 // Y position from commonValues
        z: -zoom * Math.cos(radians)                   // Z position for depth (zoom)
    };

    const rotation = currentRotation || { x: 0, y: fixedAngleDegrees, z: 0 };

    initialMediaState.position = { ...position };
    initialMediaState.rotation = { ...rotation };

    let entity;

    if (mediaItem.type === "image") {
        entity = document.createElement("a-image");
        entity.setAttribute("src", mediaItem.url);
        entity.setAttribute("position", position);   // Set position with zoom applied
        entity.setAttribute("rotation", rotation);   // Set rotation
        entity.setAttribute("scale", commonValues.scale);
        entity.setAttribute("visible", "true");

        scene.appendChild(entity);
    }

    // Handle audio if present (not relevant to your current case)
    if (mediaItem.audioUrl) {
        if (currentAudio) {
            currentAudio.pause();
            document.body.removeChild(currentAudio);
        }
        const audio = document.createElement('audio');
        audio.setAttribute('src', mediaItem.audioUrl);
        audio.setAttribute('id', 'audio-' + index);
        audio.setAttribute('preload', 'auto');
        audio.setAttribute('muted', 'true');
        audio.setAttribute('loop', 'true');
        document.body.appendChild(audio);
        currentAudio = audio;

        if (!isIOS() && !isAndroid()) {
            currentAudio.play();
        }
    }
}



function fadeOutElement(element) {
    element.setAttribute("animation", {
        property: "opacity",
        to: 0,
        dur: 2000,
        easing: "easeInOutQuad",
        startEvents: "startFadeOut",
    });

    element.addEventListener("animationcomplete", () => {
        element.parentNode.removeChild(element);
    });

    element.emit("startFadeOut");
}

function changeMedia(mediaArray, commonValues) {
    if (isChangingMedia) {
        return;
    }
    isChangingMedia = true;

    // Preserve current position and rotation
    const currentPosition = mediaEntity.getAttribute("position");
    const currentRotation = mediaEntity.getAttribute("rotation");

    // Update modelIndex to the next media element in the array
    modelIndex = (modelIndex + 1) % mediaArray.length;

    // Display the new media element while preserving the position and rotation
    displayMedia(mediaArray, modelIndex, commonValues, currentPosition, currentRotation);

    // Ensure any audio is handled correctly
    if (currentAudio) {
        if (currentAudio.paused) {
            currentAudio.muted = false; // Ensure the audio is unmuted
            currentAudio.play().catch(error => {
            });
        } else {
            currentAudio.pause();
        }
    }

    // Reset the flag after a delay to allow further media changes
    setTimeout(() => {
        isChangingMedia = false;
    }, 1000); // Adjust the timeout as needed

    // Show the congratulations pop-up after a short delay for testing
    setTimeout(showCongratulationsPopup, 60000); // Set to 0 for immediate testing
}



function createLookImages() {
    let scene = document.querySelector("a-scene");

    lookImages.forEach((lookImage) => {
        if (lookImage.parentNode) {
            lookImage.parentNode.removeChild(lookImage);
        }
    });
    lookImages = [];

    const angles = [90, 180, 270];
    angles.forEach((angle) => {
        const radians = ((fixedAngleDegrees + angle) * Math.PI) / 180;
        const lookX = -currentZoom * Math.sin(radians);
        const lookZ = -currentZoom * Math.cos(radians);

        const lookImage = document.createElement("a-image");
        lookImage.setAttribute("src", "./assets/images/UI/look-for1.png");
        lookImage.setAttribute("position", { x: lookX, y: 0, z: lookZ });
        lookImage.setAttribute("rotation", {
            x: 0,
            y: angle + fixedAngleDegrees,
            z: 0,
        });
        lookImage.setAttribute("scale", "14 4 1");
        lookImage.setAttribute("visible", "true");
        scene.appendChild(lookImage);
        lookImages.push(lookImage);
    });
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
    return /Android/.test(navigator.userAgent);
}

document.addEventListener("touchstart", function (e) {
    e.preventDefault(); // Prevent default touch actions
    if (e.touches.length === 2) {
        initialPinchDistance = getPinchDistance(e);
        isPinching = true; // Set the flag to indicate a pinch gesture
    } else if (e.touches.length === 1) {
        isDragging = true;
        initialTouchX = e.touches[0].pageX;
        initialTouchY = e.touches[0].pageY;
        initialFixedAngle = fixedAngleDegrees;
        currentY = mediaEntity.getAttribute("position").y;
        dragAxis = null; // Reset drag axis
    }
});


document.addEventListener("touchmove", function (e) {
    if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault();
        const currentPinchDistance = getPinchDistance(e);
        updateZoom(currentPinchDistance);
    } else if (isDragging && e.touches.length === 1 && !isPinching) {
        e.preventDefault();
        const currentTouchX = e.touches[0].pageX;
        const currentTouchY = e.touches[0].pageY;
        const deltaX = currentTouchX - initialTouchX;
        const deltaY = currentTouchY - initialTouchY;

        if (dragAxis === null) {
            dragAxis = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
        }

        let position = mediaEntity.getAttribute("position");

        if (dragAxis === "x") {
            fixedAngleDegrees = initialFixedAngle - deltaX * dragSpeedX;


            const radians = (fixedAngleDegrees * Math.PI) / 180;
            const x = -currentZoom * Math.sin(radians);
            const z = -currentZoom * Math.cos(radians);

            mediaEntity.setAttribute("position", { x, y: position.y, z });
            mediaEntity.setAttribute("rotation", `0 ${fixedAngleDegrees} 0`);

            if (frameEntity) {
                frameEntity.setAttribute("position", { x, y: position.y, z });
                frameEntity.setAttribute("rotation", `0 ${fixedAngleDegrees} 0`);
            }

            lookImages.forEach((lookImage, index) => {
                const angle = (index + 1) * 90;
                const lookRadians = ((fixedAngleDegrees + angle) * Math.PI) / 180;
                const lookX = -currentZoom * Math.sin(lookRadians);
                const lookZ = -currentZoom * Math.cos(lookRadians);
                lookImage.setAttribute("position", { x: lookX, y: 0, z: lookZ });
                lookImage.setAttribute("rotation", { x: 0, y: angle + fixedAngleDegrees, z: 0 });
            });


        } else if (dragAxis === "y") {
            const adjustedDragSpeedY = dragSpeedY * (currentZoom / 45);
            const newY = position.y - deltaY * adjustedDragSpeedY;
            const clampedY = Math.max(minY, Math.min(maxY, newY));

            mediaEntity.setAttribute("position", { x: position.x, y: clampedY, z: position.z });

            if (frameEntity) {
                frameEntity.setAttribute("position", { x: position.x, y: clampedY, z: position.z });
            }
        }

        initialMediaState.position = { ...mediaEntity.getAttribute("position") };
        initialMediaState.rotation = { ...mediaEntity.getAttribute("rotation") };

        updateCurrentValues();
    }
}, { passive: false });



document.addEventListener("touchend", function () {
    initialPinchDistance = null;
    isDragging = false;
    isPinching = false;
    dragAxis = null;
});

function getPinchDistance(e) {
    const dx = e.touches[0].pageX - e.touches[1].pageX;
    const dy = e.touches[0].pageY - e.touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
}

function updateZoom(currentPinchDistance) {
    if (mediaEntity) {
        const directionX = -Math.sin((fixedAngleDegrees * Math.PI) / 180);
        const directionZ = -Math.cos((fixedAngleDegrees * Math.PI) / 180);
        let distanceChange =
            -(currentPinchDistance - initialPinchDistance) * zoomSpeed;
        let newZoom = currentZoom + distanceChange;

        newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

        const x = newZoom * directionX;
        const z = newZoom * directionZ;

        mediaEntity.setAttribute("position", { x, y: currentY, z });
        if (frameEntity) {
            frameEntity.setAttribute("position", { x, y: currentY, z });
        }
        currentZoom = newZoom;

        initialMediaState.position = { x, y: currentY, z };

        updateCurrentValues();
    }
}

document.querySelectorAll('a-entity, a-image, a-video').forEach(el => {
    const position = el.getAttribute('position');
    if (position.x === 0 && position.y === 0 && position.z === 0) {
    }
});

function updateCurrentValues() {
    currentFixedAngleDisplay.textContent = fixedAngleDegrees.toFixed(2);
    currentYPositionDisplay.textContent = currentY.toFixed(2);
    currentZDepthDisplay.textContent = mediaEntity.getAttribute('position').z.toFixed(2);
}
