# from fastapi import FastAPI
# from app.api.v1.endpoints import router as router

# app = FastAPI(title="CiceronAI")
# app.include_router(router, prefix="/api/v1")


# @app.get("/")
# async def root():
#     return {"message": "welcome to ciceron AI"}

from app.services.metrics import process_complete_analysis
from pathlib import Path

if __name__ == "__main__":
    BASE_DIR = Path(__file__).resolve().parent
    audio_path = BASE_DIR / "data" / "test" / "seg-int-con.wav"
    data = process_complete_analysis(audio_path, num_speakers=1)

    transcription = data["transcript"]

    # for linea in transcription:
    #     print(
    #         f"[{linea['start']}-{linea['end']}] {linea['speaker']}: {linea['text']}")
    metrics = data["metrics"]
    key_metrics_names = [
        "F0semitoneFrom27.5Hz_sma3nz_stddevNorm",  # Expresividad
        "loudness_sma3_amean",                     # Proyección
        "loudness_sma3_stddevNorm",                # Énfasis
        "loudnessPeaksPerSec",                     # Velocidad
        "VoicedSegmentsPerSec",                    # Ritmo
        "MeanUnvoicedSegmentLength",               # Silencios
        "jitterLocal_sma3nz_amean",                # Seguridad (Jitter)
        "shimmerLocaldB_sma3nz_amean"              # Seguridad (Shimmer)
    ]
    for speaker, speaker_metrics in metrics.items():
        print(f"Metrics for {speaker}:")
        for name in key_metrics_names:
            print(f"{name}: {speaker_metrics.get(name)}")
