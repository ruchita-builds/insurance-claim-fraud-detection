document.addEventListener("DOMContentLoaded", () => {

    const formInputs = document.querySelectorAll("#prediction-form input");

    // Save form data on input
    formInputs.forEach(input => {
        input.addEventListener("input", () => {
            const formData = {};
            formInputs.forEach(inp => {
                formData[inp.id] = inp.value;
            });
            localStorage.setItem("predictionFormData", JSON.stringify(formData));
        });
    });

    // Load saved form data
    const savedData = localStorage.getItem("predictionFormData");
    if (savedData) {
        const formData = JSON.parse(savedData);
        formInputs.forEach(input => {
            if (formData[input.id] !== undefined) {
                input.value = formData[input.id];
            }
        });
    }

    // Hide states first
    document.getElementById("loading-state").classList.add('hidden');
    document.getElementById("processing-state").classList.add('hidden');
    document.getElementById("error-state").classList.add('hidden');
    document.getElementById("result-card").classList.add('hidden');

    // THEN restore result
    const savedProbability = localStorage.getItem("lastPredictionProbability");
    if (savedProbability !== null) {
        showResult(parseFloat(savedProbability), null);
    }
});

async function predictFraud() {
    const analyzeBtn = document.getElementById('analyze-btn');
    const loadingState = document.getElementById('loading-state');
    const processingState = document.getElementById('processing-state');
    const errorState = document.getElementById('error-state');
    const resultCard = document.getElementById('result-card');
    const resetBtn = document.getElementById('reset-btn');

    if (!document.getElementById('prediction-form').checkValidity()) {
        document.getElementById('prediction-form').reportValidity();
        return;
    }

    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    resultCard.classList.add('hidden');
    processingState.classList.remove('hidden');

    analyzeBtn.disabled = true;
    resetBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Executing Inference...';

    const data = {
        age_of_driver: parseFloat(document.getElementById('age').value),
        annual_income: parseFloat(document.getElementById('annual_income').value),
        vehicle_price: parseFloat(document.getElementById('vehicle_price').value),
        total_claim: parseFloat(document.getElementById('total_claim_amount').value),
        injury_claim: parseFloat(document.getElementById('injury_claim').value),
        policy_deductible: parseFloat(document.getElementById('policy_deductible').value),
        past_num_of_claims: parseFloat(document.getElementById('past_number_of_claims').value),
        days_open: parseFloat(document.getElementById('days_open').value)
    };

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("https://insurance-claim-fraud-detection-rqsw.onrender.com/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal
        });

        clearTimeout(timeout);

        if (response.ok) {
            const result = await response.json();
            const probability = result.fraud_probability !== undefined
                ? result.fraud_probability
                : (result.probability ? result.probability * 100 : 0);

            // Save result in localStorage
            localStorage.setItem("lastPredictionProbability", probability);

            setTimeout(() => {
                showResult(probability, data);
            }, 600);
        } else {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Inference Engine API Error:", error);
        setTimeout(() => {
            showError("Connection to inference endpoint timed out. Please verify that the FastAPI backend is running on port 8000.");
        }, 800);
    }
}

function showResult(probability, inputData) {
    document.getElementById('processing-state').classList.add('hidden');
    document.getElementById('result-card').classList.remove('hidden');

    const meter = document.getElementById("meter-fill");
    const probText = document.getElementById("probability-text");
    const riskLabel = document.getElementById("risk-label");
    const confidenceLabel = document.getElementById("confidence-label");
    const recText = document.getElementById("recommendation-text");
    const recIcon = document.getElementById("recommendation-icon");
    const recBox = document.getElementById("recommendation-box");

    meter.style.width = "0%";
    void meter.offsetWidth;
    animateValue(probText, 0, probability, 800);
    meter.style.width = probability + "%";

    const topFeatureBars = document.querySelectorAll('.feature-bar-fill');

    if (probability <= 35.0) {
        meter.style.background = "var(--success)";
        probText.style.color = "var(--text-primary)";
        probText.style.textShadow = "0 0 20px rgba(16, 185, 129, 0.2)";
        riskLabel.className = "badge-risk low";
        riskLabel.innerText = "Low Risk";
        confidenceLabel.innerText = "High Confidence";
        recIcon.className = "ph-fill ph-check-circle text-green";
        recText.innerText = "Auto-Approve Claim Authorization";
        recBox.style.borderColor = "rgba(16, 185, 129, 0.3)";
        setTimeout(() => {
            topFeatureBars[0].style.width = "40%";
            topFeatureBars[1].style.width = "25%";
            topFeatureBars[2].style.width = "15%";
            topFeatureBars.forEach((bar, i) => bar.style.background = "var(--success)");
        }, 100);
    } else if (probability <= 75.0) {
        meter.style.background = "var(--warning)";
        probText.style.color = "var(--warning)";
        probText.style.textShadow = "0 0 20px rgba(245, 158, 11, 0.2)";
        riskLabel.className = "badge-risk medium";
        riskLabel.innerText = "Elevated Risk";
        confidenceLabel.innerText = "Moderate Confidence";
        recIcon.className = "ph-fill ph-warning text-warning";
        recText.innerText = "Manual Review Pipeline Advised";
        recBox.style.borderColor = "rgba(245, 158, 11, 0.3)";
        setTimeout(() => {
            topFeatureBars[0].style.width = "75%";
            topFeatureBars[1].style.width = "50%";
            topFeatureBars[2].style.width = "40%";
            topFeatureBars.forEach((bar, i) => bar.style.background = "var(--warning)");
        }, 100);
    } else {
        meter.style.background = "var(--danger)";
        probText.style.color = "var(--danger)";
        probText.style.textShadow = "0 0 20px rgba(239, 68, 68, 0.3)";
        riskLabel.className = "badge-risk high";
        riskLabel.innerText = "Critical Fraud Risk";
        confidenceLabel.innerText = "High Confidence";
        recIcon.className = "ph-fill ph-shield-warning text-danger";
        recText.innerText = "Halt Processing. Flag to SIU.";
        recBox.style.borderColor = "rgba(239, 68, 68, 0.3)";
        setTimeout(() => {
            topFeatureBars[0].style.width = "95%";
            topFeatureBars[1].style.width = "82%";
            topFeatureBars[2].style.width = "65%";
            topFeatureBars.forEach((bar, i) => bar.style.background = "var(--danger)");
        }, 100);
    }

    restoreButtons();
}

// Reset Analysis clears everything including localStorage
function resetAnalysis() {
    document.getElementById("prediction-form").reset();
    resetFormState();
    localStorage.removeItem("predictionFormData");
    localStorage.removeItem("lastPredictionProbability");

    const topFeatureBars = document.querySelectorAll('.feature-bar-fill');
    topFeatureBars.forEach(bar => bar.style.width = "0%");
}

function resetFormState() {
    document.getElementById('error-state').classList.add('hidden');
    document.getElementById('result-card').classList.add('hidden');
    document.getElementById('processing-state').classList.add('hidden');
    document.getElementById('loading-state').classList.remove('hidden');

    document.getElementById("meter-fill").style.width = "0%";
    document.getElementById("probability-text").innerText = "0.0%";
    restoreButtons();
}

function showError(msg) {
    document.getElementById('processing-state').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
    if (msg) document.getElementById('error-message').innerText = msg;
    restoreButtons();
}

function restoreButtons() {
    const analyzeBtn = document.getElementById('analyze-btn');
    const resetBtn = document.getElementById('reset-btn');
    analyzeBtn.disabled = false;
    resetBtn.disabled = false;
    analyzeBtn.innerHTML = '<i class="ph-bold ph-scan"></i> Predict Fraud Risk';
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentVal = (progress * (end - start) + start).toFixed(1);
        obj.innerHTML = currentVal + "%";
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerHTML = end.toFixed(1) + "%";
    };
    window.requestAnimationFrame(step);
}

// Knowledge Base Toggle
function toggleKnowledgeBase() {
    const content = document.getElementById("kb-content");
    const icon = document.getElementById("kb-icon");
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.style.transform = "rotate(0deg)";
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        icon.style.transform = "rotate(180deg)";
    }
}

// Help Modal
function openHelpModal() {
    document.getElementById("help-modal").classList.remove("hidden");
}
function closeHelpModal() {
    document.getElementById("help-modal").classList.add("hidden");
}
window.onclick = function (event) {
    const modal = document.getElementById("help-modal");
    if (event.target == modal) closeHelpModal();
}