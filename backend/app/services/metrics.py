import opensmile
from pydub import AudioSegment
import os
from tempfile import NamedTemporaryFile
from threading import Lock
from time import perf_counter

from app.services.transcription import normalize_audio, split_audio

_smile = None
_smile_lock = Lock()
_smile_inference_lock = Lock()


def _get_smile() -> opensmile.Smile:
    global _smile

    if _smile is None:
        with _smile_lock:
            if _smile is None:
                _smile = opensmile.Smile(
                    feature_set=opensmile.FeatureSet.eGeMAPSv02,
                    feature_level=opensmile.FeatureLevel.Functionals,
                )

    return _smile


def _log_stage_duration(stage_name: str, started_at: float) -> None:
    elapsed = perf_counter() - started_at
    print(f"[timing] {stage_name}: {elapsed:.2f}s")


def get_audio_metrics(audio_path: str):
    print(f"extracting metrics from: {audio_path}")
    smile = _get_smile()
    started_at = perf_counter()

    with _smile_inference_lock:
        y = smile.process_file(audio_path)

    metrics = y.to_dict(orient="records")[0]
    _log_stage_duration("opensmile_metrics", started_at)
    print(f"metrics extracted successfully, {len(metrics)} features found")

    return metrics


def process_complete_analysis(audio_path: str, num_speakers: int):
    print(f"starting complete analysis for: {audio_path}")
    analysis_started_at = perf_counter()
    normalized_path = None

    try:
        normalization_started_at = perf_counter()
        normalized_path = normalize_audio(audio_path)
        _log_stage_duration("audio_normalization", normalization_started_at)

        split_started_at = perf_counter()
        data = split_audio(normalized_path, num_speakers)
        _log_stage_duration("transcription_and_diarization_pipeline", split_started_at)

        transcript = data["transcript"]
        diarization_raw = data["diarization_raw"]
        print(f"transcript retrieved with {len(transcript)} segments")
        print(f"diarization retrieved with {len(diarization_raw)} segments")

        audio_load_started_at = perf_counter()
        full_audio = AudioSegment.from_file(normalized_path)
        _log_stage_duration("normalized_audio_load", audio_load_started_at)
        print(f"audio file loaded, duration: {len(full_audio) / 1000:.2f} seconds")

        # Preparamos contenedores para los audios de cada speaker
        # Usamos un dict para que funcione con cualquier nombre que asigne Pyannote
        speaker_audio_buckets = {}
        print("processing diarization segments...")
        bucket_build_started_at = perf_counter()

        for seg in diarization_raw:
            spk = seg["speaker"]
            if spk not in speaker_audio_buckets:
                speaker_audio_buckets[spk] = AudioSegment.empty()
                print(f"new speaker detected: {spk}")

            # Extraemos el trozo (convertimos segundos a milisegundos)
            start_ms = int(seg["start"] * 1000)
            end_ms = int(seg["end"] * 1000)
            chunk = full_audio[start_ms:end_ms]

            # Lo pegamos al audio total de esa persona
            speaker_audio_buckets[spk] += chunk

        _log_stage_duration("speaker_audio_bucket_build", bucket_build_started_at)
        print(
            f"all segments processed, total speakers: {len(speaker_audio_buckets)}")

        # Métricas de openSMILE para cada persona
        speaker_metrics = {}
        print("extracting metrics for each speaker...")
        metrics_total_started_at = perf_counter()
        for spk, combined_audio in speaker_audio_buckets.items():
            audio_duration = len(combined_audio) / 1000
            print(
                f"processing speaker {spk}, audio duration: {audio_duration:.2f} seconds")
            with NamedTemporaryFile(
                delete=False,
                prefix=f"ciceron_{spk}_",
                suffix=".wav",
            ) as tmp:
                temp_filename = tmp.name

            speaker_metrics_started_at = perf_counter()
            try:
                combined_audio.export(temp_filename, format="wav")
                print(f"temporary file created: {temp_filename}")

                # Llamamos a tu función de métricas
                speaker_metrics[spk] = get_audio_metrics(temp_filename)
            finally:
                _log_stage_duration(
                    f"speaker_metrics_{spk}",
                    speaker_metrics_started_at,
                )
                if os.path.exists(temp_filename):
                    os.remove(temp_filename)
                    print(f"temporary file removed: {temp_filename}")

        _log_stage_duration("speaker_metrics_total", metrics_total_started_at)

        result = {
            "metadata": {
                "file": audio_path,
                "speakers_detected": list(speaker_audio_buckets.keys())
            },
            "transcript": transcript,      # La lista de frases con speaker y tiempo
            "metrics": speaker_metrics      # Métricas de openSMILE por speaker
        }
        _log_stage_duration("complete_analysis_total", analysis_started_at)
        print(
            f"analysis completed successfully for {len(speaker_audio_buckets)} speakers")
        return result
    finally:
        if normalized_path and os.path.exists(normalized_path):
            os.remove(normalized_path)
            print(f"normalized temporary file removed: {normalized_path}")
