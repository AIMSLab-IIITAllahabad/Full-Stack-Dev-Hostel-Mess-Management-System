"""Vision pipeline: YOLO26 person detection + InsightFace (ArcFace) embeddings.

Division of labour:
  - YOLO26 (Ultralytics) answers: "is there a person in front of the kiosk?"
    Fast gate so we don't run face analysis on empty frames.
  - InsightFace answers: "where exactly is the face, and what is its
    512-dimensional ArcFace embedding?"
"""

import numpy as np
from ultralytics import YOLO
from insightface.app import FaceAnalysis

import config

PERSON_CLASS_ID = 0  # COCO class 0 = person


class FaceEngine:
    def __init__(self):
        print("[engine] Loading YOLO26 model (downloads on first run)...")
        self.yolo = YOLO(config.YOLO_MODEL)

        print("[engine] Loading InsightFace model (downloads on first run)...")
        self.face_app = FaceAnalysis(name="buffalo_l")
        # ctx_id=0 uses GPU if available, falls back to CPU; det_size is the
        # detector input resolution.
        self.face_app.prepare(ctx_id=0, det_size=(640, 640))

        print("[engine] Models ready.")

    def person_present(self, frame_bgr):
        """Fast YOLO26 check: is at least one person visible?"""
        results = self.yolo.predict(frame_bgr, verbose=False, imgsz=480)

        for result in results:
            if result.boxes is None:
                continue
            for cls in result.boxes.cls.tolist():
                if int(cls) == PERSON_CLASS_ID:
                    return True

        return False

    def best_face(self, frame_bgr):
        """Detect faces; return (embedding_list, bbox) for the largest
        confident face, or (None, None) if no usable face found."""
        faces = self.face_app.get(frame_bgr)

        best = None
        best_area = 0

        for face in faces:
            if face.det_score < config.MIN_FACE_DET_SCORE:
                continue

            x1, y1, x2, y2 = face.bbox
            area = max(0, x2 - x1) * max(0, y2 - y1)

            if area > best_area:
                best_area = area
                best = face

        if best is None:
            return None, None

        # normed_embedding is L2-normalized, length 512 — exactly what the
        # backend's cosine similarity expects.
        embedding = np.asarray(best.normed_embedding, dtype=float).tolist()
        bbox = [int(v) for v in best.bbox]

        return embedding, bbox