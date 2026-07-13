"""Text-to-speech for the kiosk (offline, uses Windows SAPI via pyttsx3).

Speech runs in a background thread so the camera loop never freezes.
A fresh engine per utterance avoids pyttsx3's cross-thread quirks on Windows.
"""

import threading

try:
    import pyttsx3
    _AVAILABLE = True
except ImportError:
    _AVAILABLE = False

_lock = threading.Lock()


def _speak_blocking(text):
    try:
        with _lock:  # one utterance at a time
            engine = pyttsx3.init()
            engine.setProperty("rate", 170)
            engine.setProperty("volume", 1.0)
            engine.say(text)
            engine.runAndWait()
            engine.stop()
    except Exception as err:
        print(f"[voice] TTS failed: {err}")


def speak(text):
    """Speak asynchronously; never blocks the caller."""
    if not _AVAILABLE:
        print(f"[voice] (pyttsx3 not installed) would say: {text}")
        return

    threading.Thread(target=_speak_blocking, args=(text,), daemon=True).start()