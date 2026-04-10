const FINGER_TIPS = [4, 8, 12, 16, 20];

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function averagePoint(points) {
  const total = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
      z: acc.z + (point.z ?? 0),
    }),
    { x: 0, y: 0, z: 0 },
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length,
  };
}

function getFingerStates(landmarks) {
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];

  return {
    thumbOpen: Math.abs(thumbTip.x - wrist.x) > Math.abs(thumbIp.x - wrist.x) + 0.03,
    indexOpen: indexTip.y < indexPip.y,
    middleOpen: middleTip.y < middlePip.y,
    ringOpen: ringTip.y < ringPip.y,
    pinkyOpen: pinkyTip.y < pinkyPip.y,
  };
}

function getPalmSize(landmarks) {
  return distance(landmarks[0], landmarks[9]);
}

function getCurvatureScore(landmarks) {
  const palmSize = getPalmSize(landmarks) || 1;

  return FINGER_TIPS.map((tipIndex) => distance(landmarks[tipIndex], landmarks[0]) / palmSize);
}

export function classifySign(landmarks) {
  if (!landmarks?.length) {
    return null;
  }

  const fingerStates = getFingerStates(landmarks);
  const palmSize = getPalmSize(landmarks) || 1;
  const tipCenter = averagePoint(FINGER_TIPS.map((index) => landmarks[index]));
  const wrist = landmarks[0];
  const indexBase = landmarks[5];
  const pinkyBase = landmarks[17];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const middleDip = landmarks[11];
  const fingerLengths = getCurvatureScore(landmarks);
  const pinchDistance = distance(thumbTip, indexTip) / palmSize;
  const thumbToMiddle = distance(thumbTip, middleTip) / palmSize;
  const handWidth = distance(indexBase, pinkyBase) / palmSize;
  const openCount = Object.values(fingerStates).filter(Boolean).length;

  if (
    !fingerStates.thumbOpen &&
    !fingerStates.indexOpen &&
    !fingerStates.middleOpen &&
    !fingerStates.ringOpen &&
    !fingerStates.pinkyOpen &&
    pinchDistance > 0.45
  ) {
    return { label: "A", confidence: 0.88 };
  }

  if (
    !fingerStates.thumbOpen &&
    fingerStates.indexOpen &&
    fingerStates.middleOpen &&
    fingerStates.ringOpen &&
    fingerStates.pinkyOpen &&
    tipCenter.y < wrist.y - 0.18
  ) {
    return { label: "B", confidence: 0.91 };
  }

  if (
    openCount >= 4 &&
    handWidth > 0.65 &&
    fingerLengths.every((score) => score > 1.35) &&
    thumbToMiddle > 0.85
  ) {
    return { label: "C", confidence: 0.8 };
  }

  if (
    fingerStates.indexOpen &&
    !fingerStates.middleOpen &&
    !fingerStates.ringOpen &&
    !fingerStates.pinkyOpen &&
    thumbTip.y < wrist.y &&
    pinchDistance > 0.55
  ) {
    return { label: "D", confidence: 0.83 };
  }

  if (
    !fingerStates.indexOpen &&
    !fingerStates.middleOpen &&
    !fingerStates.ringOpen &&
    !fingerStates.pinkyOpen &&
    thumbTip.y < middleDip.y &&
    fingerLengths.slice(1).every((score) => score < 1.2)
  ) {
    return { label: "E", confidence: 0.82 };
  }

  if (
    fingerStates.indexOpen &&
    fingerStates.middleOpen &&
    !fingerStates.ringOpen &&
    !fingerStates.pinkyOpen
  ) {
    return { label: "U", confidence: 0.78 };
  }

  if (
    fingerStates.indexOpen &&
    fingerStates.middleOpen &&
    !fingerStates.ringOpen &&
    !fingerStates.pinkyOpen &&
    distance(indexTip, middleTip) / palmSize > 0.25
  ) {
    return { label: "V", confidence: 0.8 };
  }

  if (
    !fingerStates.thumbOpen &&
    !fingerStates.indexOpen &&
    !fingerStates.middleOpen &&
    !fingerStates.ringOpen &&
    fingerStates.pinkyOpen
  ) {
    return { label: "I", confidence: 0.8 };
  }

  if (pinchDistance < 0.18 && openCount <= 2) {
    return { label: "O", confidence: 0.74 };
  }

  return null;
}
