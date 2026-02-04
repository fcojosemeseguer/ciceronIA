from faster_whisper import WhisperModel
import torch
from pyannote.audio import Pipeline

import os
from dotenv import load_dotenv


load_dotenv()
model_size = "small"
hf_token = os.getenv('HUGGING_FACE')

# esto hay que cambiarlo, de momento así para probar en local
model = WhisperModel(model_size, device="cpu", compute_type="int8")


def transcribe(audio_path: str):
    print(f"starting transcription for: {audio_path}")
    segments, info = model.transcribe(
        audio_path,
        beam_size=1,
        condition_on_previous_text=True,
        temperature=0.0,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 800, "speech_pad_ms": 300},
        compression_ratio_threshold=3.5,
        log_prob_threshold=1.0,
        no_speech_threshold=0.7
    )
    print(f"transcription completed successfully")
    return segments


def run_diarization(audio_path: str, num_speakers: int):
    print(f"starting diarization for: {audio_path}")
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        token=hf_token
    )
    print("diarization pipeline loaded successfully")

    # cambiar también cuando se implemente en producción
    device = torch.device(
        "mps" if torch.backends.mps.is_available() else "cpu")
    print(f"using device: {device}")
    pipeline.to(device)

    diarization = pipeline(audio_path, num_speakers=num_speakers)
    print("diarization processing completed")
    segments = []
    for turn, _, speaker in diarization.speaker_diarization.itertracks(yield_label=True):
        segments.append({
            "start": turn.start,
            "end": turn.end,
            "speaker": speaker
        })
    print(f"diarization segments extracted: {len(segments)} segments found")
    return segments


def merge_close_segments(segments, max_gap_seconds=0.3):
    if not segments:
        return []

    merged = []
    current = segments[0].copy()
    for seg in segments[1:]:
        if seg["speaker"] == current["speaker"] and seg["start"] - current["end"] <= max_gap_seconds:
            current["end"] = max(current["end"], seg["end"])
            continue
        merged.append(current)
        current = seg.copy()
    merged.append(current)
    return merged


def split_audio(audio_path: str, num_speakers: int):
    print(f"processing audio file: {audio_path}")
    whisper_results = list(transcribe(audio_path))
    print(f"whisper transcription returned {len(whisper_results)} segments")
    diarization_results = run_diarization(audio_path, num_speakers)
    diarization_results = merge_close_segments(
        diarization_results, max_gap_seconds=0.3)

    final_transcript = []
    print("matching transcription segments with speaker labels...")

    for w_seg in whisper_results:
        w_start = w_seg.start
        w_end = w_seg.end

        speaker_id = "UNKNOWN"
        max_overlap = 0.0
        for d_seg in diarization_results:
            overlap_start = max(w_start, d_seg["start"])
            overlap_end = min(w_end, d_seg["end"])
            overlap = overlap_end - overlap_start
            if overlap > max_overlap:
                max_overlap = overlap
                speaker_id = d_seg["speaker"]

        if max_overlap <= 0.0 and diarization_results:
            nearest = None
            nearest_dist = float("inf")
            for d_seg in diarization_results:
                if w_end < d_seg["start"]:
                    dist = d_seg["start"] - w_end
                elif w_start > d_seg["end"]:
                    dist = w_start - d_seg["end"]
                else:
                    dist = 0.0

                if dist < nearest_dist:
                    nearest_dist = dist
                    nearest = d_seg

            max_nearest_gap_seconds = 0.5
            if nearest is not None and nearest_dist <= max_nearest_gap_seconds:
                speaker_id = nearest["speaker"]

        # Guardamos la información limpia
        final_transcript.append({
            "speaker": speaker_id,
            "start": round(w_seg.start, 2),
            "end": round(w_seg.end, 2),
            "text": w_seg.text.strip()
        })

    print(
        f"matching completed, {len(final_transcript)} final transcript segments created")
    return {
        "audio_file": audio_path,
        "transcript": final_transcript,
        "diarization_raw": diarization_results
    }
