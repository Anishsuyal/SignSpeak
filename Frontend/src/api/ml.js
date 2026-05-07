const ML_API_URL = import.meta.env.VITE_ML_API_URL || "http://localhost:8001";

export async function predictSequence(frames) {
  const response = await fetch(`${ML_API_URL}/predict-sequence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ frames }),
  });

  if (!response.ok) {
    throw new Error(`ML prediction failed with status ${response.status}`);
  }

  return response.json();
}

export async function resetDecoder() {
  const response = await fetch(`${ML_API_URL}/decoder/reset`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`ML decoder reset failed with status ${response.status}`);
  }

  return response.json();
}

export async function speakText(text) {
  const response = await fetch(`${ML_API_URL}/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Speech request failed with status ${response.status}`);
  }

  return response.json();
}
