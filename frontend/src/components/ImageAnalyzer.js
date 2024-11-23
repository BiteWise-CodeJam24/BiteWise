import React, { useState, useEffect, useRef } from 'react';
import * as tmImage from '@teachablemachine/image';
import '@tensorflow/tfjs';

const ImageAnalyzer = () => {
    const [model, setModel] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [imageSrc, setImageSrc] = useState(null);
    const [isWebcamActive, setIsWebcamActive] = useState(false);
    const [chosenItem, setChosenItem] = useState(null);
    const webcamContainerRef = useRef(null);
    const URL = "model/"; 

    let webcam, labelContainer, maxPredictions;

    useEffect(() => {
        const loadModel = async () => {
            const modelURL = URL + "model.json";
            const metadataURL = URL + "metadata.json";

            try {
                const loadedModel = await tmImage.load(modelURL, metadataURL);
                setModel(loadedModel);
            } catch (error) {
                console.error("Error loading model:", error);
            }
        };

        loadModel();
    }, []);

    const initWebcam = async () => {
        if (webcam) return; 

        try {
            console.log("Setting up webcam...");
            webcam = new tmImage.Webcam(200, 200, true); 
            await webcam.setup();
            console.log("Webcam setup completed");

            if (webcam && webcam.canvas) {
                await webcam.play();
                webcamContainerRef.current.appendChild(webcam.canvas);
                maxPredictions = model.getTotalClasses();
                labelContainer = document.getElementById("label-container");
                for (let i = 0; i < maxPredictions; i++) {
                    labelContainer.appendChild(document.createElement("div"));
                }
                startPredictionLoop();
            } else {
                console.error("Webcam canvas is not available or webcam setup failed");
            }
        } catch (error) {
            console.error("Error initializing webcam:", error);
        }
    };

    const startPredictionLoop = async () => {
        const loop = async () => {
            if (!webcam) return;
            webcam.update();
            await predict();
            window.requestAnimationFrame(loop);
        };
        window.requestAnimationFrame(loop);
    };

    const predict = async () => {
        if (!model) return;

        const prediction = await model.predict(webcam.canvas);
        const highestPrediction = prediction.reduce((max, current) => {
            return current.probability > max.probability ? current : max;
        });

        setPrediction({
            className: highestPrediction.className,
            probability: highestPrediction.probability.toFixed(2),
        });
    };

    const startWebcam = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setIsWebcamActive(true);
                initWebcam();
            } catch (error) {
                console.error("Error accessing webcam:", error);
            }
        } else {
            console.error("Webcam not supported in this browser.");
        }
    };

    const stopWebcam = () => {
        if (webcam) {
            webcam.stop();
        }
        setIsWebcamActive(false);
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageSrc(reader.result); 
                predictImage(reader.result); 
            };
            reader.readAsDataURL(file);
        }
    };

    const predictImage = async (imageData) => {
        if (!model) return;

        const img = new Image();
        img.src = imageData;
        img.onload = async () => {
            const prediction = await model.predict(img);
            const highestPrediction = prediction.reduce((max, current) => {
                return current.probability > max.probability ? current : max;
            });

            setPrediction({
                className: highestPrediction.className,
                probability: highestPrediction.probability.toFixed(2),
            });
        };
    };
    const handleChooseItem = () => {
        if (prediction) {
            setChosenItem({
                className: prediction.className,
                probability: prediction.probability,
            });
        }
    };

    return (
        <div>
            <div>Teachable Machine Image Model</div>
            
            {/* Toggle between webcam and manual image upload */}
            <button onClick={() => setIsWebcamActive(!isWebcamActive)}>
                {isWebcamActive ? 'Switch to Manual Upload' : 'Use Webcam'}
            </button>

            {isWebcamActive ? (
                <div>
                    <button onClick={startWebcam}>Start Webcam</button>
                    <button onClick={stopWebcam}>Stop Webcam</button>
                    <div ref={webcamContainerRef}></div>
                </div>
            ) : (
                <div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} />
                </div>
            )}

            {imageSrc && <img src={imageSrc} alt="uploaded" style={{ width: '200px', marginTop: '10px' }} />}
            
            <div id="label-container" style={{ marginTop: '20px' }}>
                {prediction ? (
                    <div>
                        {prediction.className}: {prediction.probability}
                    </div>
                ) : (
                    <div>No predictions yet.</div>
                )}
            </div>

            <button onClick={handleChooseItem}>Choose Item</button>

            {chosenItem && (
                <div style={{ marginTop: '20px' }}>
                    <strong>Chosen Item:</strong>
                    <div>
                        {chosenItem.className}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageAnalyzer;