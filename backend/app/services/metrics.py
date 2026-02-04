import opensmile
import pandas as pd
from pydub import AudioSegment
import os
from app.services.transcription import split_audio


def get_audio_metrics(audio_path: str):
    print(f"extracting metrics from: {audio_path}")
    smile = opensmile.Smile(
        # estos se pueden cambiar para conseguir otras características
        feature_set=opensmile.FeatureSet.eGeMAPSv02,
        feature_level=opensmile.FeatureLevel.Functionals
    )

    y = smile.process_file(audio_path)
    metrics = y.to_dict(orient='records')[0]
    print(f"metrics extracted successfully, {len(metrics)} features found")

    return metrics


def process_complete_analysis(audio_path: str, num_speakers: int):
    print(f"starting complete analysis for: {audio_path}")
    data = split_audio(audio_path, num_speakers)
    transcript = data["transcript"]
    diarization_raw = data["diarization_raw"]
    print(f"transcript retrieved with {len(transcript)} segments")
    print(f"diarization retrieved with {len(diarization_raw)} segments")

    full_audio = AudioSegment.from_file(audio_path)
    print(f"audio file loaded, duration: {len(full_audio) / 1000:.2f} seconds")

    # Preparamos contenedores para los audios de cada speaker
    # Usamos un dict para que funcione con cualquier nombre que asigne Pyannote
    speaker_audio_buckets = {}
    print("processing diarization segments...")

    for seg in diarization_raw:
        spk = seg["speaker"]
        if spk not in speaker_audio_buckets:
            speaker_audio_buckets[spk] = AudioSegment.empty()
            print(f"new speaker detected: {spk}")

        # Extraemos el trozo (convertimos segundos a milisegundos)
        start_ms = seg["start"] * 1000
        end_ms = seg["end"] * 1000
        chunk = full_audio[start_ms:end_ms]

        # Lo pegamos al audio total de esa persona
        speaker_audio_buckets[spk] += chunk

    print(
        f"all segments processed, total speakers: {len(speaker_audio_buckets)}")

    # Métricas de openSMILE para cada persona
    speaker_metrics = {}
    print("extracting metrics for each speaker...")
    for spk, combined_audio in speaker_audio_buckets.items():
        # Guardamos un archivo temporal para que openSMILE pueda leerlo
        temp_filename = f"temp_{spk}.wav"
        audio_duration = len(combined_audio) / 1000
        print(
            f"processing speaker {spk}, audio duration: {audio_duration:.2f} seconds")
        combined_audio.export(temp_filename, format="wav")
        print(f"temporary file created: {temp_filename}")

        # Llamamos a tu función de métricas
        speaker_metrics[spk] = get_audio_metrics(temp_filename)

        # Limpiamos el archivo temporal (opcional, pero recomendado)
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
            print(f"temporary file removed: {temp_filename}")

    result = {
        "metadata": {
            "file": audio_path,
            "speakers_detected": list(speaker_audio_buckets.keys())
        },
        "transcript": transcript,      # La lista de frases con speaker y tiempo
        "metrics": speaker_metrics      # Métricas de openSMILE por speaker
    }
    print(
        f"analysis completed successfully for {len(speaker_audio_buckets)} speakers")
    return result
