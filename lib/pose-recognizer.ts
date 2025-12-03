import { NormalizedLandmark } from "@mediapipe/tasks-vision";

export class PoseBuffer {
    buffer: NormalizedLandmark[][] = []; // Array of Frames. Each Frame is Array of Pose Landmarks (33 points).
    maxSize: number;

    constructor(maxSize: number = 30) {
        this.maxSize = maxSize;
    }

    add(landmarks: NormalizedLandmark[]) {
        this.buffer.push(landmarks);
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
    }

    getBuffer() {
        return this.buffer;
    }

    clear() {
        this.buffer = [];
    }
}

export function recognizePose(buffer: PoseBuffer): string | null {
    const frames = buffer.getBuffer();
    if (frames.length < 10) return null; // Need history for motion

    const current = frames[frames.length - 1];
    if (!current || current.length === 0) return null;

    // Helpers
    const dist = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot(a.x - b.x, a.y - b.y);
    const midpoint = (a: NormalizedLandmark, b: NormalizedLandmark) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: 0, visibility: 1 });

    // Landmarks
    const nose = current[0];
    const leftShoulder = current[11];
    const rightShoulder = current[12];
    const leftElbow = current[13];
    const rightElbow = current[14];
    const leftWrist = current[15];
    const rightWrist = current[16];
    const leftHip = current[23];
    const rightHip = current[24];

    // Derived Points
    const chest = midpoint(leftShoulder, rightShoulder);
    const stomach = midpoint(leftHip, rightHip);
    const belly = { x: (chest.x + stomach.x) / 2, y: (chest.y + stomach.y) / 2 + 0.1, z: 0, visibility: 1 };

    // Motion Analysis Helper
    const getMotion = (landmarkIndex: number, history: number = 5) => {
        const recent = frames.slice(-history);
        let totalDist = 0;
        for (let i = 1; i < recent.length; i++) {
            totalDist += dist(recent[i][landmarkIndex], recent[i - 1][landmarkIndex]);
        }
        return totalDist;
    };

    const getDirection = (landmarkIndex: number, history: number = 5) => {
        const start = frames[frames.length - history][landmarkIndex];
        const end = frames[frames.length - 1][landmarkIndex];
        return { dx: end.x - start.x, dy: end.y - start.y };
    };

    const getOscillations = (landmarkIndex: number, history: number = 10) => {
        const recent = frames.slice(-history);
        let flips = 0;
        let lastDx = 0;
        let lastDy = 0;

        for (let i = 1; i < recent.length; i++) {
            const dx = recent[i][landmarkIndex].x - recent[i - 1][landmarkIndex].x;
            const dy = recent[i][landmarkIndex].y - recent[i - 1][landmarkIndex].y;

            // Filter noise (Increased threshold to 0.01 to ignore jitter)
            if (Math.hypot(dx, dy) < 0.01) continue;

            if (lastDx !== 0 || lastDy !== 0) {
                // Check for direction reversal (dot product < 0)
                if (dx * lastDx + dy * lastDy < 0) {
                    flips++;
                }
            }
            lastDx = dx;
            lastDy = dy;
        }
        return flips;
    };

    // Helper: Check if landmark has been in a specific zone for the entire history
    // This prevents "approach motion" from counting as "rubbing motion"
    const isInZone = (landmarkIndex: number, target: NormalizedLandmark, radius: number, history: number = 10) => {
        const recent = frames.slice(-history);
        return recent.every(frame => dist(frame[landmarkIndex], target) < radius);
    };

    // 1. HOT (Claw from Mouth)
    // Logic: Hand starts near Mouth (Pinched) -> Moves Down/Out (Open)

    // Check Current State (End of gesture)
    const lWrist = current[15];
    const rWrist = current[16];

    // Check Past State (Start of gesture - e.g. 5-10 frames ago)
    const pastIndex = Math.max(0, frames.length - 8);
    const past = frames[pastIndex];
    const pastNose = past[0];
    const pastLWrist = past[15];
    const pastRWrist = past[16];
    const pastLIndex = past[19];
    const pastRIndex = past[20];

    // Check Left Hand HOT
    const lStartNearMouth = dist(pastLWrist, pastNose) < 0.2 || dist(pastLIndex, pastNose) < 0.2;
    const lMovedDown = lWrist.y > pastLWrist.y + 0.15; // Increased threshold to 0.15
    // Pinch Check (Thumb to Index)
    // Pose landmarks are rough, but let's try.
    // const lWasPinched = dist(pastLIndex, pastLThumb) < 0.05; // Might be too strict for Pose model
    // Let's rely on Position + Motion primarily, maybe "Open" check at end?
    // User said "Pinched then Open".
    // Let's check if Hand *was* near mouth and *is now* lower.

    if (lStartNearMouth && lMovedDown) {
        return "HOT";
    }

    // Check Right Hand HOT
    const rStartNearMouth = dist(pastRWrist, pastNose) < 0.2 || dist(pastRIndex, pastNose) < 0.2;
    const rMovedDown = rWrist.y > pastRWrist.y + 0.15;

    if (rStartNearMouth && rMovedDown) {
        return "HOT";
    }

    // 2. COLD (Hug Self)
    // Wrists crossed or near opposite shoulders + Shivering (High frequency, low amplitude motion?)
    // Or just tight hug held for a moment.
    const lWristRS = dist(leftWrist, rightShoulder);
    const rWristLS = dist(rightWrist, leftShoulder);
    const handsCrossed = dist(leftWrist, rightWrist) < 0.2 && dist(leftElbow, rightElbow) < 0.4;

    if ((lWristRS < 0.25 && rWristLS < 0.25) || handsCrossed) {
        // Check for "Shiver" - rapid small movements?
        // Or just holding the pose is enough for "COLD" context.
        // Let's require holding it for a bit (low motion over large distance, but maybe jitter?)
        // Let's just return COLD if held.
        return "COLD";
    }

    // 3. HAPPY (Rub Chest)
    // Hands near Chest + Circular/Vertical Motion
    // Constraint: Must be IN ZONE for 20 frames (prevents approach trigger)
    const lInZone = isInZone(15, chest, 0.3, 20);
    const rInZone = isInZone(16, chest, 0.3, 20);

    if (lInZone || rInZone) {
        // Check for motion
        const lMotion = getMotion(15, 20);
        const rMotion = getMotion(16, 20);
        const lOsc = getOscillations(15, 20);
        const rOsc = getOscillations(16, 20);

        // Rubbing implies continuous motion AND direction changes
        // Require at least 2 flips (Up-Down-Up or Left-Right-Left)
        // Require significant total motion (> 0.15)
        if ((lInZone && lMotion > 0.15 && lOsc >= 2) || (rInZone && rMotion > 0.15 && rOsc >= 2)) {
            // Distinguish from TIRED (Hands on chest but static/drooping)
            return "HAPPY";
        }
    }

    // 4. HUNGRY (Rub Stomach)
    // Hands near Belly + Circular/Vertical Motion
    // Constraint: Must be IN ZONE for 20 frames
    const lInBellyZone = isInZone(15, belly, 0.3, 20);
    const rInBellyZone = isInZone(16, belly, 0.3, 20);

    // Stricter threshold for belly to avoid "Hands Down" false positive
    // Also check that hands are ABOVE hips significantly?
    // Belly Y is approx (ChestY + HipY)/2 + 0.1.
    // If hands are just hanging, they might be near hips.
    // Let's require hands to be slightly HIGHER than hips.
    const handsAboveHips = leftWrist.y < leftHip.y && rightWrist.y < rightHip.y;

    // Center Check: Hands should be somewhat centered (not just at side)
    // Belly X is roughly midpoint of hips.
    const lCentered = Math.abs(leftWrist.x - belly.x) < 0.2;
    const rCentered = Math.abs(rightWrist.x - belly.x) < 0.2;

    if ((lInBellyZone || rInBellyZone) && handsAboveHips && (lCentered || rCentered)) {
        const lMotion = getMotion(15, 20);
        const rMotion = getMotion(16, 20);
        const lOsc = getOscillations(15, 20);
        const rOsc = getOscillations(16, 20);

        if ((lInBellyZone && lMotion > 0.15 && lOsc >= 2) || (rInBellyZone && rMotion > 0.15 && rOsc >= 2)) {
            return "HUNGRY";
        }
    }

    // 5. TIRED (Drooping / Hands on Chest->Down)
    // Hands near Shoulders/Chest + HOLD (Static)
    // Constraint: Must be IN ZONE for 15 frames (Hold for ~0.5 sec) - Reduced from 30
    const lInShoulderZone = isInZone(15, leftShoulder, 0.35, 15) || isInZone(15, chest, 0.35, 15);
    const rInShoulderZone = isInZone(16, rightShoulder, 0.35, 15) || isInZone(16, chest, 0.35, 15);

    if (lInShoulderZone || rInShoulderZone) {
        const lMotion = getMotion(15, 15);
        const rMotion = getMotion(16, 15);

        // Low motion = Tired/Resting
        // Relaxed threshold to 0.10 to allow for breathing/micro-movements
        if ((lInShoulderZone && lMotion < 0.10) || (rInShoulderZone && rMotion < 0.10)) {
            return "TIRED";
        }
    }

    return null;
}
